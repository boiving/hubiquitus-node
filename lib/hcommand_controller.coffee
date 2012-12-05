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

###
This Controller takes care of all hCommands. Loads the requested hCommand,
sets a timeout for it in case it hangs up and calls callback when finishes executing
(even if there was an error)

The hCommands that can be processed should be in the folder specified
by the param modulePath in the constructor.
###
hResultStatus = require("./codes").hResultStatus
fs = require("fs")
path = require("path")
log = require("winston")
validator = require("./validator")
dbPool = require("./dbPool").getDbPool()

class Controller
  ###
  Starts an hCommandController
  @param params - {
  modulePath : <String> (Path to the modules directory)
  timeout : <int> (time to wait before sending a timeout hResult)
  }
  ###
  constructor: (params) ->
    @params = params

    #Dummy context
    @context = hActor:
      filter: {}
      buildResult: (actor, ref, status, result) ->
        hmessage = {}
        hmessage.msgid = "DummyMsgId"
        hmessage.actor = actor
        hmessage.convid = hmessage.msgid
        hmessage.ref = ref
        hmessage.type = "hResult"
        hmessage.priority = 0
        hmessage.publisher = "DummyJid"
        hmessage.published = new Date()
        hresult = {}
        hresult.status = status
        hresult.result = result
        hmessage.payload = hresult
        hmessage


  ###
  Tries to load a module, returns undefined if couldn't find.
  @param module - name of the module to load
  ###
  loadModule: (module) ->
    modulePath = @params.modulePath

    #Try to load Module ignoring case
    fileNames = fs.readdirSync(modulePath)
    regex = new RegExp(module, "i")

    for name in fileNames
      if regex.test(name)
        module = require(path.resolve(path.join(modulePath, name))).Command
        return new module()

    null


  ###
  Returns a hmessage with result payload with all the needed attributes
  @param hMessage - the hMessage with the hCommand payload
  @param status - the Status of the hResult
  @param resObject - the optional object sent as a response
  ###
  createResult: (hMessage, status, resObject) ->
    @context.hActor.buildResult hMessage.publisher, hMessage.msgid, status, resObject


  ###
  Loads the hCommand module, sets the listener calls cb with the hResult.
  @param hMessage - The received hMessage with a hCommand payload
  @param cb - Callback receiving a hResult (optional)
  ###
  execCommand: (hMessage, cb) ->
    self = this
    timerObject = null #setTimeout timer variable
    commandTimeout = null #Time in ms to wait to launch timeout
    hMessageResult = undefined
    return  unless hMessage
    cb = cb or (hMessage) ->

    hCommand = hMessage.payload

    #check hCommand
    if not hCommand or typeof hCommand isnt "object"
      cb self.createResult(hMessage, hResultStatus.INVALID_ATTR, "Invalid payload. Not an hCommand")
      return
    if not hCommand.cmd or typeof hCommand.cmd isnt "string"
      cb self.createResult(hMessage, hResultStatus.INVALID_ATTR, "Invalid command. Not a string")
      return
    if hCommand.params and typeof hCommand.params isnt "object"
      cb self.createResult(hMessage, hResultStatus.INVALID_ATTR, "Invalid command. Params is settled but not an object")
      return
    module = @loadModule(hCommand.cmd + ".coffee")
    if module
      commandTimeout = module.timeout or @params.timeout

      onResult = (status, result) ->
        #If callback is called after the timer ignore it
        return  unless timerObject?
        clearTimeout timerObject
        hMessageResult = self.createResult(hMessage, status, result)

        log.debug "hCommand Controller sent hMessage with hResult", hMessageResult
        cb hMessageResult

      #Add a timeout for the execution
      timerObject = setTimeout(->
        #Set it to null to test if cb is executed after timeout
        timerObject = null
        hMessageResult = self.createResult(hMessage, hResultStatus.EXEC_TIMEOUT)
        log.debug "hCommand Controller sent hMessage with exceed timeout error", hMessageResult
        cb hMessageResult
      , commandTimeout)

      #Run it!
      try
        module.exec hMessage, @context, onResult
      catch err
        clearTimeout timerObject
        log.error "Error in hCommand processing, hMessage = " + hMessage + " with error : " + err
        return cb(@context.hActor.buildResult(hMessage.publisher, hMessage.msgid, hResultStatus.TECH_ERROR, "error processing message : " + err))
    else
      #Module not found
      hMessageResult = self.createResult(hMessage, hResultStatus.NOT_AVAILABLE)
      log.warn "hCommand Controller sent hMessage with module not found error", hMessageResult
      cb hMessageResult

exports.Controller = Controller