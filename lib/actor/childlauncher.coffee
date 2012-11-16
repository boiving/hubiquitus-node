
main = ->

  args = process.argv.slice(2)

  actorProps = JSON.parse args[1]
  actorModule = require "#{__dirname}/#{args[0]}"

  actor = actorModule.newActor(actorProps);

  # Acknowledging parent process that the job has been done
  process.send( {state: "ready"} )

  # Transmitting any message from parent actor to child actor
  process.on "message" , (msg) ->
    #console.log("Child process got message",msg)
    actor.emit "message", msg

main()