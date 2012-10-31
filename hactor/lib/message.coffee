class Message
  constructor: (actor, type, payload, options) ->
    options = options or {}
    throw new Error("missing actor")  unless actor
    @actor = actor
    @ref = options.ref  if options.ref
    @convid = options.convid  if options.convid
    @type = type  if type
    @priority = options.priority  if options.priority
    @relevance = options.relevance  if options.relevance
    if options.relevanceOffset
      currentDate = new Date()
      @relevance = new Date(currentDate.getTime() + options.relevanceOffset)
    @persistent = options.persistent  if options.persistent isnt null or options.persistent isnt `undefined`
    @location = options.location  if options.location
    @author = options.author  if options.author
    @published = options.published  if options.published
    @headers = options.headers  if options.headers
    @payload = payload  if payload
    @timeout = options.timeout  if options.timeout
  toJson: ->
    JSON.stringify(@)

exports.Message = Message
exports.buildMessage = (actor, type, payload, options) ->
  new Message(actor, type, payload, options)