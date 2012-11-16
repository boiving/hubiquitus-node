fs = require "fs"
adapters = require "./adapters"
{Actor} = require "./actor/actor"
os = require "os"
_ = require "underscore"

createActor = (props) ->
  actorModule = require "#{__dirname}/actor/#{props.type}"
  actor = actorModule.newActor(props)

main = ->

  engineId = "engine@localhost"
  hTopology = `undefined`
  try
    hTopology = eval("(" + fs.readFileSync("./conf/conf.json", "utf8") + ")")
  catch err
    console.log "erreur : ",err
  unless hTopology
    console.log "No config file or malformated config file. Can not start actor"
    process.exit 1


  mockActor = { actor: "process"+process.pid }

  engine = createActor(hTopology)

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