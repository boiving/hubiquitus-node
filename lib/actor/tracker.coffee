{Actor} = require "./actor"
adapters = require "./../adapters"
_ = require "underscore"
codes = require("./../codes.coffee").hResultStatus

class Tracker extends Actor

  constructor: (props) ->
    super
    #TODO check props
    @state.peers = []
    @on "started", -> @pingChannel(props.broadcastUrl)

  receive: (message) ->
    @log "Tracker received a message: #{JSON.stringify(message)}"
    if message.type is "peer-info"
      existPeer = false
      _.forEach @state.peers, (peers) =>
        if peers.peerID is message.payload.peerId
          existPeer = true
          peers.peerStatus = message.payload.peerStatus
      if existPeer isnt true
        @state.peers.push {peerType:message.payload.peerType, peerID:message.payload.peerId, peerStatus:message.payload.peerStatus, peerInbox:message.payload.peerInbox}
        outbox = @findOutbox(message.payload.peerId)
        if outbox
          @state.outboundAdapters.push adapters.outboundAdapter(outbox.type, { targetActorAid: outbox.targetActorAid, owner: @, url: outbox.url })

    else if message.type is "peer-search"
      # TODO reflexion sur le lookup et implementation
      outboundadapter = @findOutbox(message.payload.actor)

      if outboundadapter
        status = codes.OK
        result = outboundadapter
      else
        status = codes.INVALID_ATTR
        result = "Actor not found"

      msg = @buildResult(message.publisher, message.msgid, status, result)
      @send msg


  pingChannel: (broadcastUrl) ->
    @log "Starting a channel broadcasting on #{broadcastUrl}"
    trackerChannelAid = @createChild "channel", "inproc",
      { actor: "channel", outboundAdapters: [ { type: "channel", url: broadcastUrl } ] }
    #interval = setInterval(=>
    #    @send trackerChannelAid, "msg", "New event pusblished by tracker #{@actor}"
    #  , 3000)
    #@on "stopping", -> clearInterval(interval)

  findOutbox: (actor) ->
    outboundadapter = undefined
    _.forEach @state.peers, (peers) =>
      if peers.peerID is actor
        unless outboundadapter
          if peers.peerStatus is "started"
            _.forEach peers.peerInbox, (inbox) =>
              if inbox.type is "socket"
                outboundadapter = {type: inbox.type, targetActorAid: actor, url: inbox.url}
    outboundadapter

exports.Tracker = Tracker
exports.newActor = (props) ->
  new Tracker(props)