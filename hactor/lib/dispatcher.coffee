{Actor} = require "./actor"
adapters = require "./adapters"
zmq = require "zmq"

class Dispatcher extends Actor

  constructor: (props) ->
    super
    @workersAlias = "#{@actor}#workers"
    @on "message", -> @addWorkers(props.workers)

  addWorkers : (workerProps) ->
    dispatchingUrl = @genRandomListenPort()
    @state.outboundAdapters.push adapters.outboundAdapter("lb_socket", { targetActorAid: @workersAlias, owner: @, url: dispatchingUrl })
    @state.inboundAdapters.push adapters.inboundAdapter("lb_socket", { owner: @, url: dispatchingUrl })
    for i in [1..workerProps.nb]
      @log "Adding a new worker #{i}"
      @createChild workerProps.type, workerProps.method, actor: "worker#{i}", inboundAdapters: [ { type: "lb_socket", url: dispatchingUrl }, {type: "channel", url: "tcp://*:2998"}, {type: "sIO", url: "http://*:8080"} ]

  receive: (message) ->
    @log "Dispatcher received a message to send to workers: #{JSON.stringify(message)}"
    @send "#{@actor}#workers", message.type, message.payload

exports.Dispatcher = Dispatcher
exports.newActor = (props) ->
  new Dispatcher(props)