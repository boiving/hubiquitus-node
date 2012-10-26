{Actor} = require "./actor"
adapters = require "./adapters"
zmq = require "zmq"

class Channel extends Actor

  constructor: (props) ->
    super
    @subscribersAlias = "#{@actor}#subscribers"

  receive: (message) ->
    # TODO persit the message if necessary
    #sends to all subscribers the message received
    @send @subscribersAlias, message.type, message.payload

exports.Channel = Channel
exports.newActor = (props) ->
  new Channel(props)