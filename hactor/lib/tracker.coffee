{Actor} = require "./actor"
adapters = require "./adapters"
message = require "./message"
_ = require "underscore"

class Tracker extends Actor

  constructor: (props) ->
    super
    #TODO check props
    @state.peers = []
    @on "started", -> @pingChannel(props.broadcastUrl)

  receive: (message) ->
    @log "Tracker received a message: #{message.toJson()}"

  pingChannel: (broadcastUrl) ->
    @log "Starting a channel broadcasting on #{broadcastUrl}"
    trackerChannelAid = @createChild "channel", "inproc",
      { actor: "channel", outboundAdapters: [ { type: "channel", url: broadcastUrl } ] }
    interval = setInterval(=>
        @send trackerChannelAid, "msg", "New event pusblished by tracker #{@actor}"
      , 3000)
    @on "stopping", -> clearInterval(interval)

exports.Tracker = Tracker
exports.newActor = (props) ->
  new Tracker(props)