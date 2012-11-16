{Actor} = require "./actor"
adapters = require "./../adapters"
zmq = require "zmq"

class Channel extends Actor

  constructor: (props) ->
    super
    @type = "channel"
    @subscribersAlias = "#{@actor}#subscribers"

  receive: (message) ->
    # TODO persit the message if necessary
    #sends to all subscribers the message received
    message.publisher = @actor
    @send @subscribersAlias, message.type, message.payload

exports.Channel = Channel
exports.newActor = (props) ->
  new Channel(props)