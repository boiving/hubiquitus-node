fs = require "fs"
adapters = require "./adapters"
{Message} = require "./message"
{Actor} = require "./actor"
os = require "os"
_ = require "underscore"

createActor = (props) ->
  actorModule = require "#{__dirname}/#{props.type}"
  actor = actorModule.newActor(props)

main = ->

  engineId = "engine@localhost"

  topology =
    {
      actor: engineId
      type: "actor"
      children: [
        {
          actor: "tracker"
          type:"tracker"
          method: "inproc"
          broadcastUrl: "tcp://127.0.0.1:2998",
          inboundAdapters: [ { type: "socket", url: "tcp://*:2997" } ]
        },
        {
          actor: "dispatcher"
          type: "dispatcher"
          method: "inproc"
          workers: { method: "fork", type: "actor", nb: 2 },
          trackers: [ trackerId: "#{engineId}/tracker", trackerUrl: "tcp://127.0.0.1:2997", broadcastUrl: "tcp://127.0.0.1:2998" ]
        }
      ]
    }

  mockActor = { actor: "process"+process.pid }

  # the engine is itself an actor
  #engine = new Engine aid: engineId
  engine = createActor(topology)

  engine.on "started", ->
    # getting a proxy on the engine (for testing purpose, direct calls are indeed an option here)
    engineAdapter = adapters.outboundAdapter("inproc", owner: mockActor,  targetActorAid: engineId, ref: engine )
    #interval = setInterval(
    #  ->
    #    engineAdapter.send new Message(from: "process"+process.pid, to: engine.aid, payload: "Hello engine !")
    #  , 3000)
    # binding callbacks on exit signals
    _.forEach ["SIGINT"], (signal) ->
      process.on signal, ->
        engine.stop()
        process.exit()
     #   clearInterval interval

  # starting engine
  engine.start()

main()