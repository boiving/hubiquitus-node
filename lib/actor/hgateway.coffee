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
adapters = require "../client_connector/socketio_connector"
zmq = require "zmq"
_ = require "underscore"
validator = require "./../validator"

class Gateway extends Actor

  constructor: (props) ->
    super
    # Setting outbound adapters
    @type = 'gateway'
    if props.sIOAdapterPort
      adapterProps = {}
      adapterProps.port = props.sIOAdapterPort
      adapterProps.owner = @
      adapters.sIOAdapter(adapterProps)

  onMessageInternal: (hMessage, cb) ->
    @log "debug", "onMessage :"+JSON.stringify(hMessage)

    try
      validator.validateHMessage hMessage, (err, result) =>
        if err
          @log "debug", "hMessage not conform : ",result
        else
          if hMessage.type is "hCommand" and hMessage.actor is @actor
            @runCommand(hMessage, cb)
          else
            @receive(hMessage)
    catch error
      @log "warn", "An error occured while processing incoming message: "+error

  receive: (hMessage) ->
    @log "debug", "Gateway received a message to send to #{hMessage.actor}: #{JSON.stringify(hMessage)}"
    @send hMessage


exports.Gateway = Gateway
exports.newActor = (props) ->
  new Gateway(props)