#
# * Copyright (c) Novedia Group 2012.
# *
# *    This file is part of Hubiquitus
# *
# *    Permission is hereby granted, free of charge, to any person obtaining a copy
# *    of this software and associated documentation files (the "Software"), to deal
# *    in the Software without restriction, including without limitation the rights
# *    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
# *    of the Software, and to permit persons to whom the Software is furnished to do so,
# *    subject to the following conditions:
# *
# *    The above copyright notice and this permission notice shall be included in all copies
# *    or substantial portions of the Software.
# *
# *    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
# *    INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
# *    PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE
# *    FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
# *    ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
# *
# *    You should have received a copy of the MIT License along with Hubiquitus.
# *    If not, see <http://opensource.org/licenses/mit-license.php>.
#

{Actor} = require "./hactor"
adapters = require "./../adapters"
zmq = require "zmq"
_ = require "underscore"
validator = require "./../validator"
dbPool = require("./../dbPool.coffee").getDbPool()

class Channel extends Actor

  constructor: (props) ->
    super
    @actor = validator.getBareJID(props.actor)
    @type = "channel"
    @subscribersAlias = "#{@actor}#subscribers"
    @chdesc = props.chdesc
    @priority = props.priority or 1
    @location = props.location
    @owner = props.owner
    @subscribers = props.subscribers or []
    @active = props.active
    @headers = props.headers
    @filter = props.filter or {}

  onMessage: (hMessage) ->
    @log "debug", "onMessage :"+JSON.stringify(hMessage)

    try
      validator.validateHMessage hMessage, (err, result) =>
        if err
          @log "debug", "hMessage not conform : "+JSON.stringify(result)
        else
          hMessage.location = hMessage.location or @location;
          hMessage.priority = hMessage.priority or @priority or 1;

          #Complete missing values (msgid added later)
          hMessage.convid = (if not hMessage.convid or hMessage.convid is hMessage.msgid then hMessage.msgid else hMessage.convid)
          hMessage.published = hMessage.published or new Date()

          #Empty location and headers should not be sent/saved.
          validator.cleanEmptyAttrs hMessage, ["headers", "location"]

          if hMessage.type is "hCommand" and validator.getBareJID(hMessage.actor) is @actor
            @runCommand(hMessage)
          else
            @receive(hMessage)
    catch error
      @log "warn", "An error occured while processing incoming message: "+error

  receive: (hMessage) ->
    if hMessage.persistent is true
      timeout = hMessage.timeout
      hMessage._id = hMessage.msgid

      delete hMessage.persistent
      delete hMessage.msgid
      delete hMessage.timeout

      dbPool.getDb "admin", (dbInstance) ->
        dbInstance.saveHMessage hMessage

      hMessage.persistent = true
      hMessage.msgid = hMessage._id
      hMessage.timeout = timeout
      delete hMessage._id
    #sends to all subscribers the message received
    hMessage.publisher = @actor
    @send @buildMessage(@subscribersAlias, hMessage.type, hMessage.payload)

  ###*
  Function that stops the actor, including its children and adapters
  ###
  stop: ->
    @setStatus "stopping"
    #Remove channel from database
    dbPool.getDb "admin", (dbInstance) =>
      dbInstance.removeHChannel @actor

    # Stop children first
    _.forEach @state.children, (childAid) =>
      @send @buildMessage(childAid, "hCommand", CMD_STOP, {persistent:false})
    # Stop adapters second
    _.invoke @state.inboundAdapters, "stop"
    _.invoke @state.outboundAdapters, "stop"
    @setStatus "stopped"
    @removeAllListeners()


exports.Channel = Channel
exports.newActor = (props) ->
  new Channel(props)