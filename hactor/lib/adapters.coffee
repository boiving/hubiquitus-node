url = require "url"
zmq = require "zmq"
statuses = require("./codes").statuses
errors = require("./codes").errors
logger = require "winston"

class Adapter

  constructor: (props) ->
    @started = false
    if props.owner
    then @owner = props.owner
    else throw new Error("You must pass an actor as reference")

  start: ->
    @started = true

  stop: ->
    @started = false

class InboundAdapter extends Adapter

  constructor: (props) ->
    super

  genListenPort: ->
    Math.floor(Math.random() * 98)+3000

class SocketInboundAdapter extends InboundAdapter

  constructor: (props) ->
    super
    if props.url then @url = props.url else @url = "tcp://127.0.0.1:#{@genListenPort}"
    @type = "socket"
    @sock = zmq.socket "pull"
    @sock.identity = "SocketIA_of_#{@owner.actor}"
    @sock.on "message", (data) => @owner.emit "message", JSON.parse(data)

  start: ->
    unless @started
      @sock.bindSync @url
      @owner.log "#{@sock.identity} listening on #{@url}"
      super

  stop: ->
    if @started
      @sock.close()
      super

class LBSocketInboundAdapter extends InboundAdapter

  constructor: (props) ->
    super
    if props.url then @url = props.url else @url = "tcp://127.0.0.1:#{@genListenPort}"
    @type = "lb_socket"
    @sock = zmq.socket "pull"
    @sock.identity = "LBSocketIA_of_#{@owner.actor}"
    @sock.on "message", (data) => @owner.emit "message", JSON.parse(data)

  start: ->
    unless @started
      @sock.connect @url
      @owner.log "#{@sock.identity} listening on #{@url}"
      super

  stop: ->
    if @started
      @sock.close()
      super

class ChannelInboundAdapter extends InboundAdapter

  constructor: (props) ->
    super
    if props.url
    then @url = props.url
    else throw new Error("You must provide a channel url")
    @type = "channel"
    @sock = zmq.socket "sub"
    @sock.identity = "ChannelIA_of_#{@owner.actor}"
    @sock.on "message", (data) => @owner.emit "message", JSON.parse(data)

  start: ->
    unless @started
      @sock.connect @url
      @sock.subscribe("")
      @owner.log "#{@sock.identity} listening on #{@url}"
      super

  stop: ->
    if @started
      @sock.close()
      super


class SocketIOInboundAdapter extends InboundAdapter

  constructor: (props) ->
    super
    if props.url
    then @url = props.url
    else throw new Error("You must provide a valid url")
    @type = "sIO"
    @sock = require("socket.io").listen(8080) #Creates the HTTP server
    @sock.identity = "socket_ioIA_of_#{@owner.actor}"

    @sock.on "connection", (socket) =>
      socket.on "hConnect", (data) ->
        console.log "received hConnect", data
        socket.emit "hStatus",
          status: statuses.CONNECTED
          errorCode: errors.NO_ERROR
        data.url = props.url
        _this.owner.emit "connect", data

      socket.once "disconnect", ->
        console.log "received Disconnect"

      socket.on "hMessage", (data) ->
        _this.owner.emit "message", data

  start: ->
    unless @started
      @owner.log "#{@sock.identity} listening on #{@url}"
      super

  stop: ->
    if @started
      @sock.close()
      super

  send: (message) ->
    @start() unless @started
    console.log "sock : ",@socket
    #@sock.emit JSON.stringify(message)


class OutboundAdapter extends Adapter

  constructor: (props) ->
    if props.targetActorAid
      @targetActorAid = props.targetActorAid
    else
      throw new Error "You must provide the AID of the targeted actor"
    super

  start: ->
    super

  send: (message) ->
    throw new Error "Send method should be overriden"

class LocalOutboundAdapter extends OutboundAdapter

  constructor: (props) ->
    super
    if props.ref
    then @ref = props.ref
    else throw new Error("You must explicitely pass an actor as reference to a LocalOutboundAdapter")

  start: ->
    super

  send: (message) ->
    @start() unless @started
    @ref.emit "message", message

class ChildprocessOutboundAdapter extends OutboundAdapter

  constructor: (props) ->
    super
    if props.ref
    then @ref = props.ref
    else throw new Error("You must explicitely pass an actor child process as reference to a ChildOutboundAdapter")

  start: ->
    super

  stop: ->
    if @started
      @ref.kill()
    super

  send: (message) ->
    @start() unless @started
    @ref.send message

class SocketOutboundAdapter extends OutboundAdapter

  constructor: (props) ->
    super
    if props.url
    then @url = props.url
    else throw new Error("You must explicitely pass a valid url to a SocketOutboundAdapter")
    @sock = zmq.socket "push"
    @sock.identity = "SocketOA_of_#{@owner.actor}_to_#{@targetActorAid}"

  start:->
    super
    @sock.connect @url
    @owner.log "#{@sock.identity} writing on #{@url}"


  stop: ->
    if @started
      @sock.close()

  send: (message) ->
    @start() unless @started
    console.log "state : ",@
    console.log "send : ",message
    @sock.send JSON.stringify(message)

class LBSocketOutboundAdapter extends OutboundAdapter

  constructor: (props) ->
    props.targetActorAid = "#{props.owner.actor}#workers"
    super
    if props.url
    then @url = props.url
    else throw new Error("You must explicitely pass a valid url to a LBSocketOutboundAdapter")
    @sock = zmq.socket "push"
    @sock.identity = "LBSocketOA_of_#{@owner.actor}_to_#{@targetActorAid}"

  start:->
    @sock.bindSync @url
    @owner.log "#{@sock.identity} bound on #{@url}"
    super

  stop: ->
    if @started
      @sock.close()

  send: (message) ->
    @start() unless @started
    @sock.send JSON.stringify(message)

class ChannelOutboundAdapter extends OutboundAdapter

  constructor: (props) ->
    props.targetActorAid = "#{props.owner.actor}#subscribers"
    super
    if props.url
    then @url = props.url
    else throw new Error("You must explicitely pass a valid url to a ChannelOutboundAdapter")
    @sock = zmq.socket "pub"
    @sock.identity = "ChannelOA_of_#{@owner.actor}"

  start:->
    @sock.bindSync @url
    @owner.log "#{@sock.identity} streaming on #{@url}"
    super

  stop: ->
    if @started
      @sock.close()

  send: (message) ->
    @start() unless @started
    @sock.send JSON.stringify(message)

class SocketIOOutboundAdapter extends OutboundAdapter

  constructor: (props) ->

    super
    console.log "props :", props
    if props.url
    then @url = props.url
    else throw new Error("You must explicitely pass a valid url to a SocketIOOutboundAdapter")
    @sock = props.socket
    #@sock = require("socket.io").listen(8080)
    @sock.identity = "Socket_ioOA_of_#{@owner.actor}"
    @sock.emit "hMessage"

  start:->
    @owner.log "#{@sock.identity} streaming on #{@url}"
    super

  stop: ->
    if @started
      @sock.close()

  send: (message) ->
    @start() unless @started
    @sock.emit JSON.stringify(message)

exports.inboundAdapter = (type, props) ->
  switch type
    when "socket"
      new SocketInboundAdapter(props)
    when "lb_socket"
      new LBSocketInboundAdapter(props)
    when "channel"
      new ChannelInboundAdapter(props)
    when "sIO"
      new SocketIOInboundAdapter(props)
    else
      throw new Error "Incorrect type '#{type}'"

exports.outboundAdapter = (type, props) ->

  switch type
    when "inproc"
      new LocalOutboundAdapter(props)
    when "fork"
      new ChildprocessOutboundAdapter(props)
    when "socket"
      new SocketOutboundAdapter(props)
    when "lb_socket"
      new LBSocketOutboundAdapter(props)
    when "channel"
      new ChannelOutboundAdapter(props)
    when "sIO"
      new SocketIOOutboundAdapter(props)
    else
      throw new Error "Incorrect type '#{type}'"

exports.OutboundAdapter = OutboundAdapter