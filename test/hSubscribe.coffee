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
should = require("should")
config = require("./_config")
describe "hSubscribe", ->
  cmd = undefined
  hActor = undefined
  status = require("../lib/codes").hResultStatus
  actorModule = require("../lib/actor/hsession")
  existingCHID = "##{config.getUUID()}@localhost"
  existingCHID2 = "##{config.getUUID()}@localhost"
  inactiveChannel = "##{config.getUUID()}@localhost"

  before () ->
    topology = {
    actor: config.logins[0].jid,
    type: "hsession"
    }
    hActor = actorModule.newActor(topology)

  after () ->
    hActor.h_tearDown()
    hActor = null

  before (done) ->
    @timeout 5000
    createCmd = config.createChannel existingCHID, [config.validJID], config.validJID, true
    hActor.h_onMessageInternal createCmd,  (hMessage) ->
      hMessage.should.have.property "ref", createCmd.msgid
      hMessage.payload.should.have.property "status", status.OK
      done()

  before (done) ->
    @timeout 5000
    createCmd = config.createChannel existingCHID2, [config.logins[2].jid], config.validJID, true
    hActor.h_onMessageInternal createCmd,  (hMessage) ->
      hMessage.should.have.property "ref", createCmd.msgid
      hMessage.payload.should.have.property "status", status.OK
      done()

  before (done) ->
    @timeout 5000
    createCmd = config.createChannel inactiveChannel, [config.validJID], config.validJID, false
    hActor.h_onMessageInternal createCmd,  (hMessage) ->
      hMessage.should.have.property "ref", createCmd.msgid
      hMessage.payload.should.have.property "status", status.OK
      done()

  beforeEach ->
    cmd = config.makeHMessage(existingCHID, hActor.actor, "hCommand", {})
    cmd.payload =
      cmd: "hSubscribe"
      params: {}

  it "should return hResult error MISSING_ATTR when actor is missing", (done) ->
    delete cmd.actor
    hActor.send cmd, (hMessage) ->
      hMessage.should.have.property "ref", cmd.msgid
      hMessage.payload.should.have.property "status", status.MISSING_ATTR
      hMessage.payload.should.have.property("result").and.be.a "string"
      done()


  it "should return hResult error INVALID_ATTR with actor not a channel", (done) ->
    cmd.actor = hActor.actor
    hActor.h_onMessageInternal cmd, (hMessage) ->
      hMessage.should.have.property "ref", cmd.msgid
      hMessage.payload.should.have.property "status", status.NOT_AVAILABLE
      hMessage.payload.should.have.property("result").and.match /actor/
      done()


  it "should return hResult error NOT_AVAILABLE when actor doesnt exist", (done) ->
    cmd.actor = "#this channel does not exist@localhost"
    hActor.send cmd, (hMessage) ->
      hMessage.should.have.property "ref", cmd.msgid
      hMessage.payload.should.have.property "status", status.NOT_AVAILABLE
      hMessage.payload.should.have.property("result").and.be.a "string"
      done()


  it "should return hResult error NOT_AUTHORIZED if not in subscribers list", (done) ->
    cmd.actor = existingCHID2
    hActor.send cmd, (hMessage) ->
      hMessage.should.have.property "ref", cmd.msgid
      hMessage.payload.should.have.property "status", status.NOT_AUTHORIZED
      hMessage.payload.should.have.property("result").and.be.a "string"
      done()


  it "should return hResult error NOT_AUTHORIZED if channel is inactive", (done) ->
    cmd.actor = inactiveChannel
    hActor.send cmd, (hMessage) ->
      hMessage.should.have.property "ref", cmd.msgid
      hMessage.payload.should.have.property "status", status.NOT_AUTHORIZED
      hMessage.payload.should.have.property("result").and.be.a "string"
      done()


  it "should return hResult OK when correct", (done) ->
    cmd.actor = existingCHID
    hActor.send cmd, (hMessage) ->
      hMessage.should.have.property "ref", cmd.msgid
      hMessage.payload.should.have.property "status", status.OK
      done()


  #it "should return hResult error if already subscribed", (done) ->
  #  cmd.actor = existingCHID
  #  hActor.send cmd, (hMessage) ->
  #    hMessage.should.have.property "ref", cmd.msgid
  #    hMessage.payload.should.have.property "status", status.NOT_AUTHORIZED
  #    hMessage.payload.should.have.property("result").and.be.a "string"
  #    done()


