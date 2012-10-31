{Actor} = require "./actor"
adapters = require "./adapters"
_ = require "underscore"

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
          peers.peerStatus = message.payload.peedStatus
      if existPeer isnt true
        @state.peers.push {peerID:message.payload.peerId, peerStatus:message.payload.peerStatus, peerInbox:message.payload.peerInbox}

      console.log('Peer UtD : ',@state.peers)



  pingChannel: (broadcastUrl) ->
    @log "Starting a channel broadcasting on #{broadcastUrl}"
    trackerChannelAid = @createChild "channel", "inproc",
      { actor: "channel", outboundAdapters: [ { type: "channel", url: broadcastUrl } ] }
    #interval = setInterval(=>
    #    @send trackerChannelAid, "msg", "New event pusblished by tracker #{@actor}"
    #  , 3000)
    #@on "stopping", -> clearInterval(interval)

exports.Tracker = Tracker
exports.newActor = (props) ->
  new Tracker(props)