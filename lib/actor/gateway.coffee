{Actor} = require "./actor"
adapters = require "../client_connector/socketio_connector"
zmq = require "zmq"
_ = require "underscore"

class Gateway extends Actor

  constructor: (props) ->
    super
    # Setting outbound adapters
    @type = 'gateway'
    _.forEach props.sIOAdapters, (adapterProps) =>
      adapterProps.owner = @
      adapters.sIOAdapter(adapterProps)

  onMessage: (hMessage) ->
    @log "Gateway received a message to send to #{hMessage.actor}: #{JSON.stringify(hMessage)}"
    @send hMessage


exports.Gateway = Gateway
exports.newActor = (props) ->
  new Gateway(props)