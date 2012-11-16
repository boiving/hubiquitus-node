{Actor} = require "./actor"
zmq = require "zmq"
log = require("winston")
_ = require "underscore"
statuses = require("../codes").statuses
errors = require("../codes").errors

class Session extends Actor

  constructor: (props) ->
    super
    # Setting outbound adapters
    @type = 'session'
    @trackInbox = props.trackInbox
    @hClient = undefined

  touchTrackers: ->
    _.forEach @state.trackers, (trackerProps) =>
      @log "touching tracker #{trackerProps.trackerId}"
      msg = @buildMessage(trackerProps.trackerId, "peer-info", {peerType:@type, peerId:@actor, peerStatus:@state.status, peerInbox:@trackInbox})
      @send(msg)

  receive: (hMessage) ->
    if hMessage.actor is @actor
      @hClient.socket.emit "hMessage", hMessage
    else
      hMessage.publisher = @actor
      @log "Session received a message to send to #{hMessage.actor}: #{JSON.stringify(hMessage)}"
      @send hMessage

  initListener: (client) =>
    @hClient = client

    @on "hStatus", (msg) ->
      client.socket.emit "hStatus", msg

    @on "connect", ->
      client.publisher = @actor
      client.socket.emit "attrs",
      #serverDomain: hAdmin.getHAdmin().serverDomain
        publisher: @actor
        sid: client.id

      #Start listening for client actions
      @addSocketListeners client

    @on "disconnect", ->
      console.log("here")
      @stop()
    #Start listening for messages from Session and relaying them
    #client.hClient.on "hMessage", (hMessage) ->
    #  log.info "Sent message to client " + client.id, hMessage
    #  client.socket.emit "hMessage", hMessage
    @emit "hStatus", {status:statuses.CONNECTED, errorCode:errors.NO_ERROR}
    @emit "connect"

  addSocketListeners: (client) =>
    client.socket.on "hMessage", (hMessage) =>
      log.info "Client ID " + client.id + " sent hMessage", hMessage
      @onMessage(hMessage)

exports.Session = Session
exports.newActor = (props) ->
  new Session(props)