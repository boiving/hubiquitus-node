{Actor} = require "./actor"
adapters = require "./../adapters"
zmq = require "zmq"

class Dispatcher extends Actor

  constructor: (props) ->
    super
    @workersAlias = "#{@actor}#workers"
    @addWorkers(props.workers)
    @nbWorkers = props.workers.nb

  addWorkers : (workerProps) ->
    dispatchingUrl = @genRandomListenPort()
    @state.outboundAdapters.push adapters.outboundAdapter("lb_socket", { targetActorAid: @workersAlias, owner: @, url: dispatchingUrl })
    #@state.inboundAdapters.push adapters.inboundAdapter("lb_socket", { owner: @, url: dispatchingUrl })
    for i in [1..workerProps.nb]
      @log "Adding a new worker #{i}"
      @createChild workerProps.type, workerProps.method, actor: "worker#{i}", inboundAdapters: [ { type: "lb_socket", url: dispatchingUrl }, { type: "socket", url: @genRandomListenPort() }, {type: "channel", url: "tcp://*:2998"} ]

  receive: (message) ->
    @log "Dispatcher received a message to send to workers: #{JSON.stringify(message)}"
    loadBalancing = Math.floor(Math.random() * @nbWorkers) + 1
    sender = message.publisher
    msg = @buildMessage("#{@actor}/worker#{loadBalancing}", message.type, message.payload)
    msg.publisher = sender
    @send msg

exports.Dispatcher = Dispatcher
exports.newActor = (props) ->
  new Dispatcher(props)