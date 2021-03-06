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
codes = require "./../codes"
options = require "./../options"

class Channel extends Actor

  constructor: (properties) ->
    super
    @actor = validator.getBareJID(properties.actor)
    @type = "channel"
    @subscribersAlias = "#{@actor}#subscribers"
    @properties =
      chdesc : properties.chdesc
      priority : properties.priority or 1
      location : properties.location
      owner : properties.owner
      subscribers : properties.subscribers or []
      active : properties.active
      headers : properties.headers

  onMessage: (hMessage, cb) ->
    # If hCommand, execute it
    if hMessage.type is "hCommand" and validator.getBareJID(hMessage.actor) is validator.getBareJID(@actor)
      switch hMessage.payload.cmd
        when "hGetLastMessages"
          command = require("./../hcommands/hGetLastMessages").Command
          module = new command()
          @runCommand(hMessage, module, cb)
        when "hRelevantMessages"
          command = require("./../hcommands/hRelevantMessages").Command
          module = new command()
          @runCommand(hMessage, module, cb)
        when "hGetThread"
          command = require("./../hcommands/hGetThread").Command
          module = new command()
          @runCommand(hMessage, module, cb)
        #when "hGetThreads"
        #  command = require("./../hcommands/hGetThreads").Command
        #  module = new command()
        #  @runCommand(hMessage, module, cb)
        when "hSubscribe"
          command = require("./../hcommands/hSubscribe").Command
          module = new command()
          @runCommand(hMessage, module, cb)
        when "hSetFilter"
          @setFilter hMessage.payload.params, cb
        else
          hMessageResult = @buildResult(hMessage.publisher, hMessage.msgid, codes.hResultStatus.NOT_AVAILABLE, "Command not available for this actor")
          cb hMessageResult
    # If other type, publish
    else
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
      if cb and hMessage.timeout > 0
        hMessageResult = @buildResult(hMessage.publisher, hMessage.msgid, codes.hResultStatus.OK, "")
        cb hMessageResult

  ###
  Loads the hCommand module, sets the listener calls cb with the hResult.
  @param hMessage - The received hMessage with a hCommand payload
  @param cb - Callback receiving a hResult (optional)
  ###
  runCommand: (hMessage, module,cb) ->
    self = this
    timerObject = null #setTimeout timer variable
    commandTimeout = null #Time in ms to wait to launch timeout
    hMessageResult = undefined
    hCommand = hMessage.payload

    #check hCommand
    if not hCommand or typeof hCommand isnt "object"
      cb self.buildResult(hMessage.publisher, hMessage.msgid, codes.hResultStatus.INVALID_ATTR, "Invalid payload. Not an hCommand")
      return
    if not hCommand.cmd or typeof hCommand.cmd isnt "string"
      cb self.buildResult(hMessage.publisher, hMessage.msgid, codes.hResultStatus.INVALID_ATTR, "Invalid command. Not a string")
      return
    if hCommand.params and typeof hCommand.params isnt "object"
      cb self.buildResult(hMessage.publisher, hMessage.msgid, codes.hResultStatus.INVALID_ATTR, "Invalid command. Params is settled but not an object")
      return
    commandTimeout = module.timeout or options.commandController.timeout

    onResult = (status, result) ->
      #If callback is called after the timer ignore it
      return  unless timerObject?
      clearTimeout timerObject
      hMessageResult = self.buildResult(hMessage.publisher, hMessage.msgid, status, result)
      self.log "debug", "hCommand sent hMessage with hResult", hMessageResult
      cb hMessageResult

    #Add a timeout for the execution
    timerObject = setTimeout(->
      #Set it to null to test if cb is executed after timeout
      timerObject = null
      hMessageResult = self.buildResult(hMessage.publisher, hMessage.msgid, codes.hResultStatus.EXEC_TIMEOUT,"")
      @log "debug", "hCommand sent hMessage with exceed timeout error", hMessageResult
      cb hMessageResult
    , commandTimeout)

    #Run it!
    try
      module.exec hMessage, @, onResult
    catch err
      clearTimeout timerObject
      @log "error", "Error in hCommand processing, hMessage = " + hMessage + " with error : " + err
      cb(@buildResult(hMessage.publisher, hMessage.msgid, codes.hResultStatus.TECH_ERROR, "error processing message : " + err))


  ###*
  Function that stops the actor, including its children and adapters
  ###
  postStop: ->
    #Remove channel from database
    dbPool.getDb "admin", (dbInstance) =>
      dbInstance.removeHChannel @actor



exports.Channel = Channel
exports.newActor = (properties) ->
  new Channel(properties)