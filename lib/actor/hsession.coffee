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
zmq = require "zmq"
_ = require "underscore"
statuses = require("../codes").statuses
errors = require("../codes").errors
validator = require "../validator"

class Session extends Actor

  constructor: (properties) ->
    super
    # Setting outbound adapters
    @type = 'session'
    @trackInbox = properties.trackInbox
    @hClient = undefined
    @availableCommand = ["hSetFilter", "hCreateUpdateChannel"]

  touchTrackers: ->
    _.forEach @trackers, (trackerProps) =>
      @log "debug", "touching tracker #{trackerProps.trackerId}"
      if @status is "stopping"
        @trackInbox = []
      msg = @buildMessage(trackerProps.trackerId, "peer-info", {peerType:@type, peerId:validator.getBareJID(@actor), peerStatus:@status, peerInbox:@trackInbox}, {persistent:false})
      @send(msg)

  receive: (hMessage) ->
    if hMessage.actor is @actor
      @hClient.socket.emit "hMessage", hMessage
    else
      hMessage.publisher = @actor
      @log "debug", "Session received a message to send to #{hMessage.actor}: #{JSON.stringify(hMessage)}"
      @send hMessage

  initListener: (client) =>
    delete client["hClient"]
    @hClient = client

    @on "hStatus", (msg) ->
      client.socket.emit "hStatus", msg

    @on "connect", ->
      client.publisher = @actor
      client.socket.emit "attrs",
        publisher: @actor
        sid: client.id

      #Start listening for client actions
      client.socket.on "hMessage", (hMessage) =>
        @log "info", "Client ID " + client.id + " sent hMessage", hMessage
        @emit "message", hMessage

    @on "disconnect", ->
      @emit "hStatus", {status:statuses.DISCONNECTING, errorCode:errors.NO_ERROR}
      @stop()
    #Start listening for messages from Session and relaying them
    #client.hClient.on "hMessage", (hMessage) ->
    #  log.info "Sent message to client " + client.id, hMessage
    #  client.socket.emit "hMessage", hMessage
    @emit "hStatus", {status:statuses.CONNECTED, errorCode:errors.NO_ERROR}
    @emit "connect"

exports.Session = Session
exports.newActor = (properties) ->
  new Session(properties)