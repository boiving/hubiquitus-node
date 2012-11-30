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
    @type = "channel"
    @subscribersAlias = "#{@actor}#subscribers"

  onMessage: (hMessage) ->
    @log "debug", "onMessage :"+JSON.stringify(hMessage)

    try
      validator.validateHMessage hMessage, (err, result) =>
        if err
          @log "debug", "hMessage not conform : ",result
        else
          #Complete missing values (msgid added later)
          hMessage.convid = (if not hMessage.convid or hMessage.convid is hMessage.msgid then hMessage.msgid else hMessage.convid)
          hMessage.published = hMessage.published or new Date()

          #Empty location and headers should not be sent/saved.
          validator.cleanEmptyAttrs hMessage, ["headers", "location"]

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

          if hMessage.type is "hCommand" and hMessage.actor is @actor
            @runCommand(hMessage)
          else
            @receive(hMessage)
    catch error
      @log "warn", "An error occured while processing incoming message: "+error

  receive: (message) ->
    # TODO persit the message if necessary
    #sends to all subscribers the message received
    message.publisher = @actor
    @send @buildMessage(@subscribersAlias, message.type, message.payload)

exports.Channel = Channel
exports.newActor = (props) ->
  new Channel(props)