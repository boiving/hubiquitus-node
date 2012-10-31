#Node modules
{EventEmitter} = require "events"
forker = require "child_process"
#Third party modules
zmq = require "zmq"
logger = require "winston"
_ = require "underscore"
#Hactor modules
{OutboundAdapter} = require "./adapters"
adapters = require "./adapters"
validator = require "./validator"
db = require("./mongo.coffee").db

_.mixin toDict: (arr, key) ->
  throw new Error('_.toDict takes an Array') unless _.isArray arr
  _.reduce arr, ((dict, obj) ->
    dict[ obj[key] ] = obj if obj[key]?
    return dict), {}

###*
  Class that defines an Actor
###
class Actor extends EventEmitter

# Possible running states of an actor
  STATUS_STARTING = "starting"
  STATUS_STARTED = "started"
  STATUS_STOPPING = "stopping"
  STATUS_STOPPED = "stopped"

  # Commands
  CMD_START = { cmd: "start" }
  CMD_STOP = { cmd: "stop" }

  # Constructor
  constructor: (props) ->
    # setting up instance attributes
    @actor = props.actor

    # Initializing state
    @state = {}
    @state.status = STATUS_STOPPED
    @state.children = []
    @state.trackers = []
    @state.inboundAdapters = []
    @state.outboundAdapters = []

    # Registering trackers
    if _.isArray(props.trackers)
    then _.forEach props.trackers, (trackerProps) =>
      @log "registering tracker #{trackerProps.trackerId}"
      @state.trackers.push trackerProps
      #@state.inboundAdapters.push adapters.inboundAdapter("channel",  owner: @, url: trackerProps.broadcastUrl)
      @state.outboundAdapters.push adapters.outboundAdapter("socket",
        owner: @, targetActorAid: trackerProps.trackerId, url: trackerProps.trackerUrl)
    else
      @log "no tracker was provided"

    # Setting inbound adapters
    _.forEach props.inboundAdapters, (adapterProps) =>
      adapterProps.owner = @
      @state.inboundAdapters.push adapters.inboundAdapter(adapterProps.type, adapterProps)

    # Setting outbound adapters
    _.forEach props.outboundAdapters, (adapterProps) =>
      adapterProps.owner = @
      @state.outboundAdapters.push adapters.outboundAdapter(adapterProps.type, adapterProps)

    # registering callbacks on events
    @on "message", (message) =>
      @onMessage(message)

    # Adding children once started
    @on "started", ->
      _.forEach props.children, (childProps) =>
        @createChild childProps.type, childProps.method, childProps

    @on "connect", (props) -> @onConnect(props)

  onMessage: (hMessage) ->
    @log "onMessage :",JSON.stringify(hMessage)
    self = @

    #if _.isString(data) then message = new Message(JSON.stringify(data));
    try
      validator.validateHMessage hMessage, (err, result) ->
        if err
          console.log "hMessage not conform : ",result
        else
          if hMessage.payload.cmd then self.runCommand(hMessage.payload.cmd, hMessage.payload.parent) else self.receive(hMessage)
    catch error
      @log "An error occured while processing incoming message: "+error

  onConnect: (props) ->
    # TODO : synchro client server ?
    props.actor = props.publisher
    @createChild("actor", "fork", props)

  runCommand: (command, parent) ->
    #case of a command
    switch command
      when "start"
        @start(parent)
      when "stop"
        @stop()
      else throw new Error "Invalid command"

  receive: (message) ->
    @log "Message reveived: #{JSON.stringify(message)}"
    if message.type is "string"
      @send message.publisher, 'msg', 'bien recu merci'

  lookup: (actor) ->
    unless _.isString(actor) then throw new Error "'aid' parameter must be a string"
    # first looking up for a cached adapter
    outboundAdapter = _.toDict( @state.outboundAdapters , "targetActorAid" )[actor]
    if outboundAdapter then outboundAdapter else
      @log "Not yet implemented (returning a fake)"
      new OutboundAdapter( targetActorAid: actor )

  send: (to, type, payload, options) ->
    #console.log "actor : ",@actor
    #console.log "in : ",@state.inboundAdapters
    #console.log "out : ",@state.outboundAdapters
    outboundAdapter = @lookup to
    msg = @buildMessage(to, type, payload, options)
    @log "Sending message: #{JSON.stringify(msg)}"
    outboundAdapter.send msg

  ###*
    Function allowing that creates and start an actor as a child of this actor
    @classname {string} the
    @method {string} the method to use
    @props {object} the properties of the child actor to create
  ###
  createChild: (classname, method, props) ->

    unless _.isString(classname) then throw new Error "'classname' parameter must be a string"
    unless _.isString(method) then throw new Error "'method' parameter must be a string"

    unless props.trackers then props.trackers = @state.trackers

    # prefixing actor's id automatically
    props.actor = "#{@actor}/#{props.actor}"

    # TODO : pass trackers to the child

    switch method
      when "inproc"
        actorModule = require "#{__dirname}/#{classname}"
        childRef = actorModule.newActor(props)
        @state.outboundAdapters.push adapters.outboundAdapter(method, owner: @, targetActorAid: props.actor , ref: childRef)
        # Starting the child
        @send( props.actor, "hCommand",  CMD_START)
      when "fork"
        childRef = forker.fork __dirname+"/childlauncher", [classname , JSON.stringify(props)]
        @state.outboundAdapters.push adapters.outboundAdapter(method, owner: @, targetActorAid: props.actor , ref: childRef)
        childRef.on "message", (msg) =>
          if msg.state is 'ready' then @send( props.actor, "hCommand", CMD_START)
      else
        throw new Error "Invalid method"

    # adding aid to referenced children
    @state.children.push props.actor

    props.actor

  genRandomListenPort: ->
    "tcp://127.0.0.1:#{Math.floor(Math.random() * 98)+3000}"

  ###*
    Function that enrich a message with actor details and logs it to the console
    @message {object} the message to log
  ###
  log: (message) ->
    # TODO properly configure logging system
    logger.debug "#{@actor} | #{message}"

  touchTrackers: ->
    _.forEach @state.trackers, (trackerProps) =>
      @log "touching tracker #{trackerProps.trackerId}"
      inboundAdapters = []
      for i in @state.inboundAdapters
        inboundAdapters.push {type:i.type, url:i.url}
      @send trackerProps.trackerId, "peer-info", {peerId:@actor, peerStatus:@state.status, peerInbox:inboundAdapters}

  setStatus: (status) ->
    # alter the state
    @state.status = status
    switch status
      when STATUS_STARTED
        @touchTrackers()
      when STATUS_STOPPING
        @touchTrackers()
    # advertise
    @emit status
    # Log
    @log "new status:#{status}"

  ###*
    Function that starts the actor, including its inbound adapters
  ###
  start: ->
    @setStatus STATUS_STARTING
    _.invoke @state.inboundAdapters, "start"
    @setStatus STATUS_STARTED

  ###*
    Function that stops the actor, including its children and adapters
  ###
  stop: ->
    @setStatus STATUS_STOPPING
    # Stop children first
    _.forEach @state.children, (childAid) =>
      @send childAid, "hCommand", CMD_STOP
    # Stop adapters second
    _.invoke @state.inboundAdapters, "stop"
    _.invoke @state.outboundAdapters, "stop"
    @setStatus STATUS_STOPPED
    @removeAllListeners()

  buildMessage: (actor, type, payload, options) ->
    options = options or {}
    hMessage = {}
    throw new Error("missing actor")  unless actor
    hMessage.actor = actor
    hMessage.publisher = @actor
    hMessage.ref = options.ref  if options.ref
    hMessage.convid = options.convid  if options.convid
    hMessage.type = type  if type
    hMessage.priority = options.priority  if options.priority
    hMessage.relevance = options.relevance  if options.relevance
    if options.relevanceOffset
      currentDate = new Date()
      hMessage.relevance = new Date(currentDate.getTime() + options.relevanceOffset)
    hMessage.persistent = options.persistent or true if options.persistent isnt null or options.persistent isnt `undefined`
    hMessage.location = options.location  if options.location
    hMessage.author = options.author  if options.author
    hMessage.published = options.published  if options.published
    hMessage.headers = options.headers  if options.headers
    hMessage.payload = payload  if payload
    hMessage.timeout = options.timeout  if options.timeout
    hMessage

  buildResult: (actor, ref, status, result) ->
    hmessage = {}
    hmessage.msgid = @makeMsgId()
    hmessage.actor = actor
    hmessage.convid = hmessage.msgid
    hmessage.ref = ref
    hmessage.type = "hResult"
    hmessage.priority = 0
    hmessage.publisher = @actor
    hmessage.published = new Date()
    hresult = {}
    hresult.status = status
    hresult.result = result
    hmessage.payload = hresult
    hmessage

  ###
  Create a unique message id from a client message id
  Message id should follow the from clientMsgId#serverUniqueMsgId
  If client message id contains #, it's removed

  @param clientMsgId
  ###
  makeMsgId: (clientMsgId) ->
    msgId = ""
    try
      msgId = clientMsgId.replace("#", "")
    msgId += "#" + db.createPk()
    msgId

exports.Actor = Actor
exports.newActor = (props) ->
  new Actor(props)