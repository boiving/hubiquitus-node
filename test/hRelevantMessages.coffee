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

describe "hRelevantMessages", ->
  status = require("../lib/codes").hResultStatus
  actorModule = require("../lib/actor/hactor")
  cmd = undefined
  hActor = undefined
  nbMsgs = 10
  activeChan = "##{config.getUUID()}@localhost"
  notInPart = "##{config.getUUID()}@localhost"
  inactiveChan = "##{config.getUUID()}@localhost"
  emptyChannel = "##{config.getUUID()}@localhost"

  before () ->
    topology = {
      actor: config.logins[0].jid,
      type: "hactor"
    }
    hActor = actorModule.newActor(topology)

  after () ->
    hActor.stop()
    hActor = null

  before (done) ->
    @timeout 5000
    createCmd = config.createChannel activeChan, [config.validJID], config.validJID, true
    hActor.onMessageInternal createCmd,  (hMessage) ->
      hMessage.should.have.property "ref", createCmd.msgid
      hMessage.payload.should.have.property "status", status.OK

      i = 0
      nbOfPublish = 0
      while i < nbMsgs
        publishMsg = config.makeHMessage activeChan, hActor.actor, "string", {}
        publishMsg.timeout = 0
        publishMsg.persistent = true
        publishMsg.relevance = new Date(new Date().getTime() + 100000)
        hActor.send publishMsg
        nbOfPublish++
        i++

      i = 0
      while i < nbMsgs
        publishMsg = config.makeHMessage activeChan, hActor.actor, "string", {}
        publishMsg.timeout = 0
        publishMsg.persistent = true
        publishMsg.relevance = new Date(new Date().getTime() - 100000)
        hActor.send publishMsg
        nbOfPublish++
        i++

      i = 0
      while i < nbMsgs
        publishMsg = config.makeHMessage activeChan, hActor.actor, "string", {}
        publishMsg.timeout = 0
        publishMsg.persistent = true
        hActor.send publishMsg
        nbOfPublish++
        i++

      if nbOfPublish is 30
        done()

  before (done) ->
    @timeout 5000
    createCmd = config.createChannel emptyChannel, [config.validJID], config.validJID, true
    hActor.onMessageInternal createCmd,  (hMessage) ->
      hMessage.should.have.property "ref", createCmd.msgid
      hMessage.payload.should.have.property "status", status.OK
      done()

  before (done) ->
    @timeout 5000
    createCmd = config.createChannel notInPart, ["other@localhost"], config.validJID, true
    hActor.onMessageInternal createCmd,  (hMessage) ->
      hMessage.should.have.property "ref", createCmd.msgid
      hMessage.payload.should.have.property "status", status.OK
      done()

  before (done) ->
    @timeout 5000
    createCmd = config.createChannel inactiveChan, [config.validJID], config.validJID, false
    hActor.onMessageInternal createCmd,  (hMessage) ->
      hMessage.should.have.property "ref", createCmd.msgid
      hMessage.payload.should.have.property "status", status.OK
      done()

  beforeEach ->
    cmd = config.makeHMessage(activeChan, hActor.actor, "hCommand", {})
    cmd.msgid = "hCommandTest123"
    cmd.payload =
      cmd: "hRelevantMessages"
      params: {}

  it "should return hResult error MISSING_ATTR if actor is missing", (done) ->
    delete cmd.actor
    hActor.send cmd, (hMessage) ->
      hMessage.payload.should.have.property "status", status.MISSING_ATTR
      hMessage.payload.result.should.match /actor/
      done()


  it "should return hResult error INVALID_ATTR with actor not a channel", (done) ->
    cmd.actor = hActor.actor
    hActor.onMessageInternal cmd, (hMessage) ->
      hMessage.should.have.property "ref", cmd.msgid
      hMessage.payload.should.have.property "status", status.NOT_AVAILABLE
      hMessage.payload.should.have.property("result").and.match /Command/
      done()


  it "should return hResult error NOT_AVAILABLE if channel was not found", (done) ->
    cmd.actor = "#this channel does not exist@localhost"
    hActor.send cmd, (hMessage) ->
      hMessage.payload.should.have.property "status", status.NOT_AVAILABLE
      hMessage.payload.result.should.be.a "string"
      done()


  it "should return hResult error NOT_AUTHORIZED if not in subscribers list", (done) ->
    cmd.actor = notInPart
    hActor.send cmd, (hMessage) ->
      hMessage.payload.should.have.property "status", status.NOT_AUTHORIZED
      hMessage.payload.result.should.be.a "string"
      done()


  it "should return hResult error NOT_AUTHORIZED if channel is inactive", (done) ->
    cmd.actor = inactiveChan
    hActor.send cmd, (hMessage) ->
      hMessage.payload.should.have.property "status", status.NOT_AUTHORIZED
      hMessage.payload.result.should.be.a "string"
      done()


  it "should return hResult OK with an array of valid messages and without msgs missing relevance", (done) ->
    hActor.send cmd, (hMessage) ->
      hMessage.payload.should.have.property "status", status.OK
      hMessage.payload.result.length.should.be.eql nbMsgs

      i = 0
      while i < hMessage.payload.result.length
        hMessage.payload.result[i].relevance.getTime().should.be.above new Date().getTime()
        i++
      done()


  it "should return hResult OK with an empty array if no matching msgs found", (done) ->
    cmd.actor = emptyChannel
    hActor.send cmd, (hMessage) ->
      hMessage.payload.should.have.property "status", status.OK
      hMessage.payload.result.length.should.be.eql 0
      done()

  describe "#FilterMessage()", ->
    setMsg = undefined

    before ->
      i = 0
      while i < 5
        publishMsg = config.makeHMessage activeChan, hActor.actor, "string", {}
        publishMsg.timeout = 0
        publishMsg.persistent = true
        publishMsg.relevance = new Date(new Date().getTime() + 100000)
        publishMsg.author = "u2@localhost"
        hActor.send publishMsg
        i++

    beforeEach ->
      setMsg = config.makeHMessage(hActor.actor, config.logins[0].jid, "hCommand", {})
      setMsg.payload =
        cmd: "hSetFilter"
        params: {}

    it "should return Ok with messages respect filter", (done) ->
      setMsg.payload.params = in:
        publisher: ["u1@localhost"]

      hActor.onMessageInternal setMsg, ->

      hActor.send cmd, (hMessage) ->
        hMessage.should.have.property "type", "hResult"
        hMessage.payload.should.have.property "status", status.OK
        hMessage.payload.should.have.property('result').and.be.an.instanceof(Array)
        hMessage.payload.result.length.should.be.equal(15);

        done()


    it "should return Ok with only filtered messages with right quantity", (done) ->
      setMsg.payload.params = in:
        author: ["u2@localhost"]

      hActor.onMessageInternal setMsg, ->
      hActor.send cmd, (hMessage) ->
        hMessage.should.have.property "type", "hResult"
        hMessage.payload.should.have.property "status", status.OK
        hMessage.payload.should.have.property('result').and.be.an.instanceof(Array)
        hMessage.payload.result.length.should.be.equal(5);

        i = 0
        while i < hMessage.payload.result.length
          hMessage.payload.result[i].should.have.property "author", "u2@localhost"
          i++
        done()


