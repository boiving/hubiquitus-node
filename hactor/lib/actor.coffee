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
message = require "./message"
{Message} = require "./message"

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
  CMD_START = { command: "start" }
  CMD_STOP = { command: "stop" }

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
    @on "message", (message) => @onMessage(message)

    # Adding children once started
    @on "started", ->
      _.forEach props.children, (childProps) =>
        @createChild childProps.type, childProps.method, childProps

  onMessage: (message) ->
    @log "onMessage :",message.toString()

    #if _.isString(data) then message = new Message(JSON.stringify(data));
    try
      if (message instanceof Message)
        # TODO evaluate type instead of payload
        if message.payload.command then @runCommand(message.payload.command) else @receive(message)
      else @log "Invalid message type (ignoring)"
    catch error
      @log "An error occured while processing incoming message: "+error

  runCommand: (command) ->
    #case of a command
    switch command
      when "start"
        @start()
      when "stop"
        @stop()
      else throw new Error "Invalid command"

  receive: (message) ->
    @log "Message reveived: #{message.toString()}"

  lookup: (actor) ->
    unless _.isString(actor) then throw new Error "'aid' parameter must be a string"
    # first looking up for a cached adapter
    outboundAdapter = _.toDict( @state.outboundAdapters , "targetActorAid" )[actor]
    if outboundAdapter then outboundAdapter else
      @log "Not yet implemented (returning a fake)"
      new OutboundAdapter( targetActorAid: actor )

  send: (to, type, payload) ->
    outboundAdapter = @lookup to
    msg = message.newMessage from: @actor, to: to, type: type, payload: payload
    @log "Sending message: #{msg.toJson()}"
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
        @send( props.actor, "cmd",  CMD_START)
      when "fork"
        childRef = forker.fork __dirname+"/childlauncher", [classname , JSON.stringify(props)]
        @state.outboundAdapters.push adapters.outboundAdapter(method, owner: @, targetActorAid: props.actor , ref: childRef)
        childRef.on "message", (msg) =>
          if msg.state is 'ready' then @send( props.actor, "cmd", CMD_START)
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
      @send trackerProps.trackerId, "peer-info", peerId:@actor, peerStatus:@state.status

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
      @send childAid, "cmd", CMD_STOP
    # Stop adapters second
    _.invoke @state.inboundAdapters, "stop"
    _.invoke @state.outboundAdapters, "stop"
    @setStatus STATUS_STOPPED
    @removeAllListeners()

exports.Actor = Actor
exports.newActor = (props) ->
  new Actor(props)