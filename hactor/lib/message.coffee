class Message
  constructor: (props) ->
    @from = props.from
    @to = props.to
    @type = props.type
    @payload = props.payload
  toJson: ->
    JSON.stringify(@)

exports.Message = Message
exports.newMessage = (props) ->
  new Message (props)