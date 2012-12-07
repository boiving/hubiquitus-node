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
codes = require "./../codes.coffee"
options = require "./../options"
cmdControllerConst = require('./../hcommand_controller').Controller
hFilter = require "./../hFilter"

_.mixin toDict: (arr, key) ->
  throw new Error('_.toDict takes an Array') unless _.isArray arr
  _.reduce arr, ((dict, obj) ->
    dict[ obj[key] ] = obj if obj[key]?
    return dict), {}

###*
  Class that defines an Actor
###
class Actor extends EventEmitter

  logger.remove(logger.transports.Console)
  logger.add(logger.transports.Console, {level: "INFO"})
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
    if(validator.validateFullJID(props.actor))
      @actor = props.actor
    else if(validator.validateJID(props.actor))
      @actor = "#{props.actor}/#{UUID.generate()}"
    else
      throw new Error "Invalid actor JID"
    @type = "actor"
    @filter = props.filter or {}
    @msgToBeAnswered = {}

    # Initializing state
    @state = {}
    @state.status = STATUS_STOPPED
    @state.children = []
    @state.trackers = []
    @state.inboundAdapters = []
    @state.outboundAdapters = []

    # Initializing hcommand_controller
    @cmdController = new cmdControllerConst(options.commandController);
    @cmdController.context.hActor = @;

    # Registering trackers
    if _.isArray(props.trackers) and props.trackers.length > 0
      _.forEach props.trackers, (trackerProps) =>
        @log "debug", "registering tracker #{trackerProps.trackerId}"
        @state.trackers.push trackerProps
        #@state.inboundAdapters.push adapters.inboundAdapter("channel",  {owner: @, url: trackerProps.broadcastUrl})
        @state.outboundAdapters.push adapters.outboundAdapter("socket", {owner: @, targetActorAid: trackerProps.trackerId, url: trackerProps.trackerUrl})
    else
      @log "debug", "no tracker was provided"

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
      @initChildren(props.children)

  onMessage: (hMessage) ->
    @onMessageInternal hMessage, (hMessageResult) =>
      @send hMessageResult

  onMessageInternal: (hMessage, cb) ->
    @log "debug", "onMessage :"+JSON.stringify(hMessage)
    try
      validator.validateHMessage hMessage, (err, result) =>
        if err
          @log "debug", "hMessage not conform : ",JSON.stringify(result)
        else
          #Complete missing values (msgid added later)
          hMessage.convid = (if not hMessage.convid or hMessage.convid is hMessage.msgid then hMessage.msgid else hMessage.convid)
          hMessage.published = hMessage.published or new Date()

          #Empty location and headers should not be sent/saved.
          validator.cleanEmptyAttrs hMessage, ["headers", "location"]

          if hMessage.type is "hCommand" and validator.getBareJID(hMessage.actor) is validator.getBareJID(@actor)
            @runCommand(hMessage, cb)
          else if hMessage.type is "hStopAlert"
            @removePeer(hMessage.payload.actoraid)
          else
            #Check if hMessage respect filter
            checkValidity = hFilter.checkFilterValidity(hMessage, @filter)
            if checkValidity.result is true
              @receive(hMessage, cb)
            else
              hMessageResult = @buildResult(hMessage.publisher, hMessage.msgid, codes.hResultStatus.INVALID_ATTR, checkValidity.error)
              cb hMessageResult

    catch error
      @log "warn", "An error occured while processing incoming message: "+error

  runCommand: (hMessage, cb) ->
    #case of a command
    switch hMessage.payload.cmd
      when "start"
        @start()
      when "stop"
        @stop()
      else
        @cmdController.execCommand hMessage, (result) =>
          if hMessage.timeout is 0
            @log "debug", "the sender doesn't want callback"
          #else if limitDate.getTime() - currentDate.getTime() <= 0
          #  console.log "result 2 : ",result
          #  @log "debug", "Exceed client timeout, no callback send"
          else
            cb result


  receive: (hMessage, cb) ->
    @log "info", "Message reveived: #{JSON.stringify(hMessage)}"
    unless hMessage.timeout is 0
      hMessageResult = @buildResult(hMessage.publisher, hMessage.msgid, codes.hResultStatus.OK, "")
      cb hMessageResult

  send: (hMessage, cb) ->
    unless _.isString(hMessage.actor)
      if cb
        cb @buildResult(hMessage.publisher, hMessage.msgid, codes.hResultStatus.MISSING_ATTR, "actor is missing")
        return
      else
        throw new Error "'aid' parameter must be a string"
    # first looking up for a cached adapter
    outboundAdapter = _.toDict( @state.outboundAdapters , "targetActorAid" )[hMessage.actor]
    if outboundAdapter
      @sending(hMessage, cb, outboundAdapter)
    else
      if @state.trackers[0]
        msg = @buildMessage(@state.trackers[0].trackerId, "peer-search", {actor:hMessage.actor}, {timeout:5000, persistent:false})
        @send msg, (hResult) =>
          if hResult.payload.status is codes.hResultStatus.OK
            outboundAdapter = adapters.outboundAdapter(hResult.payload.result.type, { targetActorAid: hResult.payload.result.targetActorAid, owner: @, url: hResult.payload.result.url })
            @state.outboundAdapters.push outboundAdapter
            hMessage.actor = hResult.payload.result.targetActorAid
            @sending hMessage, cb, outboundAdapter
          else
            @log "debug", "Can't send hMessage : "+hResult.payload.result
      else
        if cb
          cb @buildResult(hMessage.publisher, hMessage.msgid, codes.hResultStatus.NOT_AVAILABLE, "Can't find actor")
          return
        else
          throw new Error "Don't have any tracker for peer-searching"

  sending: (hMessage, cb, outboundAdapter) ->
    #Complete hCommand
    errorCode = undefined
    errorMsg = undefined

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

      #Send it to transport
      @log "debug", "Sending message: #{JSON.stringify(hMessage)}"
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
    unless classname is "hchannel"
      props.actor = "#{props.actor}/#{UUID.generate()}"

    switch method
      when "inproc"
        actorModule = require "#{__dirname}/#{classname}"
        childRef = actorModule.newActor(props)
        @state.outboundAdapters.push adapters.outboundAdapter(method, owner: @, targetActorAid: props.actor , ref: childRef)
        childRef.state.outboundAdapters.push adapters.outboundAdapter(method, owner: childRef.actor, targetActorAid: @actor , ref: @)
        # Starting the child
        @send @buildMessage(props.actor, "hCommand",  CMD_START, {persistent:false})

      when "fork"
        childRef = forker.fork __dirname+"/childlauncher", [classname , JSON.stringify(props)]
        @state.outboundAdapters.push adapters.outboundAdapter(method, owner: @, targetActorAid: props.actor , ref: childRef)
        childRef.on "message", (msg) =>
          if msg.state is 'ready'
            msg = @buildMessage(props.actor, "hCommand", CMD_START, {persistent:false})
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
  log: (type, message) ->
    # TODO properly configure logging system
    switch type
      when "debug"
        logger.debug "#{validator.getBareJID(@actor)} | #{message}"
        break
      when "info"
        logger.info "#{validator.getBareJID(@actor)} | #{message}"
        break
      when "warn"
        logger.warn "#{validator.getBareJID(@actor)} | #{message}"
        break

  initChildren: (children)->
    _.forEach children, (childProps) =>
      @createChild childProps.type, childProps.method, childProps


  touchTrackers: ->
    _.forEach @state.trackers, (trackerProps) =>
      if trackerProps.trackerId isnt @actor
        @log "debug", "touching tracker #{trackerProps.trackerId}"
        inboundAdapters = []
        if @state.status isnt STATUS_STOPPING
          for i in @state.inboundAdapters
            inboundAdapters.push {type:i.type, url:i.url}
        @send @buildMessage(trackerProps.trackerId, "peer-info", {peerType:@type, peerId:validator.getBareJID(@actor), peerStatus:@state.status, peerInbox:inboundAdapters}, {persistent:false})


  setStatus: (status) ->
    # alter the state
    @state.status = status
    switch status
      when STATUS_STARTED
        @touchTrackers()
        #interval = setInterval(@touchTrackers, 60000)
      when STATUS_STOPPING
        @touchTrackers()
        #clearInterval(interval)
    # advertise
    @emit status
    # Log
    @log "debug", "new status:#{status}"

  ###*
    Function that starts the actor, including its inbound adapters
  ###
  start: ->
    @setStatus STATUS_STARTING
    _.invoke @state.inboundAdapters, "start"
    _.invoke @state.outboundAdapters, "start"
    @setStatus STATUS_STARTED

  ###*
    Function that stops the actor, including its children and adapters
  ###
  stop: ->
    @setStatus STATUS_STOPPING
    # Stop children first
    _.forEach @state.children, (childAid) =>
      @send @buildMessage(childAid, "hCommand", CMD_STOP, {persistent:false})
    # Stop adapters second
    _.invoke @state.inboundAdapters, "stop"
    _.invoke @state.outboundAdapters, "stop"
    @setStatus STATUS_STOPPED
    @removeAllListeners()

  removePeer: (actor) ->
    @log "debug", "Removing peer #{actor}"
    index = 0
    _.forEach @state.outboundAdapters, (outbound) =>
      if outbound.targetActorAid is actor
        delete @state.outboundAdapters[index]
      index++

  buildMessage: (actor, type, payload, options) ->
    options = options or {}
    hMessage = {}
    unless actor
      throw new Error("missing actor")
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
    if options.persistent isnt null or options.persistent isnt undefined
      hMessage.persistent = options.persistent
    if hMessage.persistent is null or hMessage.persistent is undefined
      hMessage.persistent = true
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
  Create a unique message id
  ###
  makeMsgId: () ->
    msgId = ""
    msgId += "#" + UUID.generate()
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

