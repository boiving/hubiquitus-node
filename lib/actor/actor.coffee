#
# * Copyright (c) Novedia Group 2012.
# *
# *    This file is part of Hubiquitus
# *
# *    Permission is hereby granted, free of charge, to any person obtaining a copy
# *    of this software and associated documentation files (the "Software"), to deal
# *    in the Software without restriction, including without limitation the rights
# *    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
# *    of the Software, and to permit persons to whom the Software is furnished to do so,
# *    subject to the following conditions:
# *
# *    The above copyright notice and this permission notice shall be included in all copies
# *    or substantial portions of the Software.
# *
# *    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
# *    INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
# *    PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE
# *    FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
# *    ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
# *
# *    You should have received a copy of the MIT License along with Hubiquitus.
# *    If not, see <http://opensource.org/licenses/mit-license.php>.
#

#Node modules
{EventEmitter} = require "events"
forker = require "child_process"
#Third party modules
zmq = require "zmq"
logger = require "winston"
_ = require "underscore"
#Hactor modules
{OutboundAdapter} = require "./../adapters"
adapters = require "./../adapters"
validator = require "./../validator"
db = require("./../mongo.coffee").db
codes = require("./../codes.coffee")

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
    @type = "actor"
    @msgToBeAnswered = {}

    # Initializing state
    @state = {}
    @state.status = STATUS_STOPPED
    @state.children = []
    @state.trackers = []
    @state.inboundAdapters = []
    @state.outboundAdapters = []

    # Registering trackers
    if _.isArray(props.trackers) and props.trackers.length > 0
      _.forEach props.trackers, (trackerProps) =>
        @log "registering tracker #{trackerProps.trackerId}"
        @state.trackers.push trackerProps
        #@state.inboundAdapters.push adapters.inboundAdapter("channel",  owner: @, url: trackerProps.broadcastUrl)
        @state.outboundAdapters.push adapters.outboundAdapter("socket", {owner: @, targetActorAid: trackerProps.trackerId, url: trackerProps.trackerUrl})
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
    @on "message", (hMessage) =>
      ref = undefined
      if hMessage and hMessage.ref and typeof hMessage.ref is "string"
        ref = hMessage.ref.split("#")[0]
      if ref
        cb = @msgToBeAnswered[ref]
      if cb
        delete @msgToBeAnswered[ref]
        cb hMessage
      else
        @onMessage hMessage


    # Adding children once started
    @on "started", ->
      _.forEach props.children, (childProps) =>
        @createChild childProps.type, childProps.method, childProps

  onMessage: (hMessage) ->
    @log "onMessage :"+JSON.stringify(hMessage)
    self = @

    #if _.isString(data) then message = new Message(JSON.stringify(data));
    try
      validator.validateHMessage hMessage, (err, result) =>
        if err
          console.log "hMessage not conform : ",result
        else
          if hMessage.type is "hCommand" and hMessage.actor is @actor
            self.runCommand(hMessage.payload.cmd)
          else
            self.receive(hMessage)
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
    @log "Message reveived: #{JSON.stringify(message)}"
    if message.publisher is 'engine@localhost/u1@localhost'
       msg = @buildMessage(message.publisher, "rep", "Bonjour à toi aussi")
       @send msg

  send: (hMessage, cb) ->
    unless _.isString(hMessage.actor) then throw new Error "'aid' parameter must be a string"
    # first looking up for a cached adapter
    outboundAdapter = _.toDict( @state.outboundAdapters , "targetActorAid" )[hMessage.actor]
    if outboundAdapter
      @sending(hMessage, cb, outboundAdapter)
    else
      msg = @buildMessage(@state.trackers[0].trackerId, "peer-search", {actor:hMessage.actor}, {timeout:5000})
      @send msg, (hResult) =>
        if hResult.payload.status is codes.hResultStatus.OK
          outboundAdapter = adapters.outboundAdapter(hResult.payload.result.type, { targetActorAid: hResult.payload.result.targetActorAid, owner: @, url: hResult.payload.result.url })
          @sending(hMessage, cb, outboundAdapter)
        else
          @log("Can't send hMessage : "+hResult.payload.result)

  sending: (hMessage, cb, outboundAdapter) ->
    #Complete hCommand
    errorCode = `undefined`
    errorMsg = `undefined`

    #Verify if well formatted
    unless hMessage.actor
      errorCode = codes.hResultStatus.MISSING_ATTR
      errorMsg = "the actor attribute is missing"

    unless errorCode
      #if there is a callback and no timeout, timeout is set to default value of 30s
      #Add it to the open message to call cb later
      if cb
        if hMessage.timeout > 0
          @msgToBeAnswered[hMessage.msgid] = cb
          timeout = hMessage.timeout
          self = this

          #if no response in time we call a timeout
          setInterval (->
            if self.msgToBeAnswered[hMessage.msgid]
              delete self.msgToBeAnswered[hMessage.msgid]
              errCode = codes.hResultStatus.EXEC_TIMEOUT
              errMsg = "No response was received within the " + timeout + " timeout"
              resultMsg = self.buildResult(hMessage.publisher, hMessage.msgid, errCode, errMsg)
              cb resultMsg
          ), timeout
        else
          hMessage.timeout = 0
      else
        hMessage.timeout = 0

      #Send it to transport
      @log "Sending message: #{JSON.stringify(hMessage)}"
      outboundAdapter.send hMessage
    else if cb
      actor = hMessage.actor or "Unknown"
      resultMsg = @buildResult(actor, hMessage.msgid, errorCode, errorMsg)
      cb resultMsg


  ###*
    Function allowing that creates and start an actor as a child of this actor
    @classname {string} the
    @method {string} the method to use
    @props {object} the properties of the child actor to create
  ###
  createChild: (classname, method, props, cb) ->

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
        msg = @buildMessage(props.actor, "hCommand",  CMD_START)
        @send msg
      when "fork"
        childRef = forker.fork __dirname+"/childlauncher", [classname , JSON.stringify(props)]
        @state.outboundAdapters.push adapters.outboundAdapter(method, owner: @, targetActorAid: props.actor , ref: childRef)
        childRef.on "message", (msg) =>
          if msg.state is 'ready'
            msg = @buildMessage(props.actor, "hCommand", CMD_START)
            @send msg
      else
        throw new Error "Invalid method"

    if cb
      cb childRef
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

  touchTrackers: =>
    _.forEach @state.trackers, (trackerProps) =>
      if trackerProps.trackerId isnt @actor
        @log "touching tracker #{trackerProps.trackerId}"
        inboundAdapters = []
        for i in @state.inboundAdapters
          inboundAdapters.push {type:i.type, url:i.url}
        msg = @buildMessage(trackerProps.trackerId, "peer-info", {peerType:@type, peerId:@actor, peerStatus:@state.status, peerInbox:inboundAdapters})
        @send(msg)


  setStatus: (status) ->
    # alter the state
    @state.status = status
    switch status
      when STATUS_STARTED
        @touchTrackers()
        #interval = setInterval(@touchTrackers, 60000)
        if @actor is "engine@localhost/dispatcher/worker2"
          msg = @buildMessage("engine@localhost/dispatcher", "msg", "Salut copain worker")
          @send msg
      when STATUS_STOPPING
        @touchTrackers()
        #clearInterval(interval)
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
      msg = @buildMessage(childAid, "hCommand", CMD_STOP)
      @send msg
    # Stop adapters second
    _.invoke @state.inboundAdapters, "stop"
    _.invoke @state.outboundAdapters, "stop"
    @setStatus STATUS_STOPPED
    @removeAllListeners()

  buildMessage: (actor, type, payload, options) ->
    options = options or {}
    hMessage = {}
    throw new Error("missing actor")  unless actor
    hMessage.publisher = @actor
    hMessage.msgid = UUID.generate()
    hMessage.published = hMessage.published or new Date()
    hMessage.sent = new Date()
    hMessage.actor = actor
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

  buildResult: (actor, ref, status, result, flag) ->
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
    hresult.flag = flag
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


UUID = ->
UUID.generate = ->
  a = UUID._gri
  b = UUID._ha
  b(a(32), 8) + "-" + b(a(16), 4) + "-" + b(16384 | a(12), 4) + "-" + b(32768 | a(14), 4) + "-" + b(a(48), 12)

UUID._gri = (a) ->
  (if 0 > a then NaN else (if 30 >= a then 0 | Math.random() * (1 << a) else (if 53 >= a then (0 | 1073741824 * Math.random()) + 1073741824 * (0 | Math.random() * (1 << a - 30)) else NaN)))

UUID._ha = (a, b) ->
  c = a.toString(16)
  d = b - c.length
  e = "0"

  while 0 < d
    d & 1 and (c = e + c)
    d >>>= 1
    e += e
  c

exports.Actor = Actor
exports.newActor = (props) ->
  new Actor(props)

