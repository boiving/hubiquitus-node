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

{Actor} = require "./actor"
adapters = require "./../adapters"
zmq = require "zmq"
validator = require "./../validator"
_ = require "underscore"

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
          if hMessage.type is "hCommand" and hMessage.actor is @actor
            @runCommand(hMessage)
          else
            @receive(hMessage)
    catch error
      @log "debug", "An error occured while processing incoming message: "+error

  receive: (message) ->
    # TODO persit the message if necessary
    #sends to all subscribers the message received
    message.publisher = @actor
    @send @buildMessage(@subscribersAlias, message.type, message.payload)

  initTrackers: (trackers) ->
    return

exports.Channel = Channel
exports.newActor = (props) ->
  new Channel(props)