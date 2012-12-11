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
describe "hActor", ->
  hActor = undefined
  hActor2 = undefined
  config = require("./_config")
  hResultStatus = require("../lib/codes").hResultStatus
  cmd = {}
  actorModule = require("../lib/actor/hsession")

  describe "#FilterMessage()", ->
    cmd = undefined
    hMsg = undefined

    before () ->
      topology = {
        actor: config.logins[0].jid,
        type: "hsession"
      }
      hActor = actorModule.newActor(topology)
      hActor.createChild "hsession", "inproc", topology, (child) =>
        hActor2 = child

    after () ->
      hActor.stop()
      hActor = null

    beforeEach ->
      cmd = config.makeHMessage(hActor.actor, config.logins[0].jid, "hCommand", {})
      cmd.payload =
        cmd: "hSetFilter"
        params: {}

      hMsg = config.makeHMessage(hActor2.actor, config.logins[0].jid, "string", {})

    it "should return Ok if empty filter", (done) ->
      hActor2.onMessageInternal hMsg, (hMessage) ->
        hMessage.should.have.property "type", "hResult"
        hMessage.payload.should.have.property "status", hResultStatus.OK
        done()


    describe "#eqFilter()", ->
      it "should return INVALID_ATTR if hMessage don't respect \"eq\" filter", (done) ->
        cmd.payload.params = eq:
          priority: 2

        hMsg.priority = 3
        hActor2.onMessageInternal cmd, ->

        hActor.send hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.INVALID_ATTR
          done()

      it "should return INVALID_ATTR if a bad attribute of hMessage is use", (done) ->
        cmd.payload.params = eq:
          attribut: "bad"

        hActor.onMessageInternal cmd, ->

        hActor.onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.INVALID_ATTR
          done()

      it "should return INVALID_ATTR if hMessage don't respect \"eq\" filter with multiple hCondition", (done) ->
        cmd.payload.params = eq:
          priority: 2
          author: config.logins[0].jid

        hMsg.priority = 2
        hMsg.author = config.logins[1].jid
        hActor.onMessageInternal cmd, ->

        hActor.onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.INVALID_ATTR
          done()

      it "should return OK if hMessage respect \"eq\" filter with multiple hCondition", (done) ->
        cmd.payload.params = eq:
          priority: 2
          author: config.logins[0].jid

        hMsg.priority = 2
        hMsg.author = config.logins[0].jid
        hActor.onMessageInternal cmd, ->

        hActor.onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.OK
          done()

      it "should return OK if hMessage respect \"eq\" filter ", (done) ->
        cmd.payload.params = eq:
          "payload.priority": 2

        hMsg.payload.priority = 2
        hActor.onMessageInternal cmd, ->

        hActor.onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.OK
          done()


    describe "#neFilter()", ->
      it "should return INVALID_ATTR if hMessage don't respect \"ne\" filter", (done) ->
        cmd.payload.params = ne:
          priority: 2

        hMsg.priority = 2
        hActor.onMessageInternal cmd, ->

        hActor.onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.INVALID_ATTR
          done()

      it "should return INVALID_ATTR if a bad attribute of hMessage is use", (done) ->
        cmd.payload.params = ne:
          attribut: "bad"

        hActor.onMessageInternal cmd, ->

        hActor.onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.INVALID_ATTR
          done()

      it "should return INVALID_ATTR if hMessage don't respect \"ne\" filter with multiple hCondition", (done) ->
        cmd.payload.params = ne:
          priority: 2
          author: config.logins[0].jid

        hMsg.priority = 3
        hMsg.author = config.logins[0].jid
        hActor.onMessageInternal cmd, ->

        hActor.onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.INVALID_ATTR
          done()

      it "should return OK if hMessage respect \"ne\" filter with multiple hCondition", (done) ->
        cmd.payload.params = ne:
          priority: 2
          author: config.logins[0].jid

        hMsg.priority = 3
        hMsg.author = config.logins[1].jid
        hActor.onMessageInternal cmd, ->

        hActor.onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.OK
          done()

      it "should return OK if hMessage respect \"ne\" filter ", (done) ->
        cmd.payload.params = ne:
          "payload.priority": 2

        hMsg.payload.priority = 3
        hActor.onMessageInternal cmd, ->

        hActor.onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.OK
          done()


    describe "#gtFilter()", ->
      it "should return INVALID_ATTR if hMessage don't respect \"gt\" filter", (done) ->
        cmd.payload.params = gt:
          priority: 2

        hMsg.priority = 2
        hActor.onMessageInternal cmd, ->

        hActor.onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.INVALID_ATTR
          done()

      it "should return INVALID_ATTR if a bad attribute of hMessage is use", (done) ->
        cmd.payload.params = gt:
          attribut: 12

        hActor.onMessageInternal cmd, ->

        hActor.onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.INVALID_ATTR
          done()

      it "should return INVALID_ATTR if an attribute is not a number", (done) ->
        cmd.payload.params = gt:
          priority: "not a number"

        hActor.onMessageInternal cmd, ->

        hActor.onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.INVALID_ATTR
          done()

      it "should return INVALID_ATTR if hMessage don't respect \"gt\" filter with multiple hCondition", (done) ->
        cmd.payload.params = gt:
          priority: 2
          timeout: 10000

        hMsg.priority = 3
        hMsg.timeout = 9999
        hActor.onMessageInternal cmd, ->

        hActor.onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.INVALID_ATTR
          done()

      it "should return OK if hMessage respect \"gt\" filter with multiple hCondition", (done) ->
        cmd.payload.params = gt:
          priority: 2
          timeout: 10000

        hMsg.priority = 3
        hActor.onMessageInternal cmd, ->

        hActor.onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.OK
          done()

      it "should return OK if hMessage respect \"gt\" filter ", (done) ->
        cmd.payload.params = gt:
          "payload.priority": 2

        hMsg.payload.priority = 3
        hActor.onMessageInternal cmd, ->

        hActor.onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.OK
          done()


    describe "#gteFilter()", ->
      it "should return INVALID_ATTR if hMessage don't respect \"gte\" filter", (done) ->
        cmd.payload.params = gte:
          priority: 2

        hMsg.priority = 1
        hActor.onMessageInternal cmd, ->

        hActor.onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.INVALID_ATTR
          done()

      it "should return INVALID_ATTR if a bad attribute of hMessage is use", (done) ->
        cmd.payload.params = gte:
          attribut: 12

        hActor.onMessageInternal cmd, ->

        hActor.onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.INVALID_ATTR
          done()

      it "should return INVALID_ATTR if an attribute is not a number", (done) ->
        cmd.payload.params = gte:
          priority: "not a number"

        hActor.onMessageInternal cmd, ->

        hActor.onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.INVALID_ATTR
          done()

      it "should return INVALID_ATTR if hMessage don't respect \"gte\" filter with multiple hCondition", (done) ->
        cmd.payload.params = gte:
          priority: 2
          timeout: 10000

        hMsg.priority = 2
        hMsg.timeout = 9999
        hActor.onMessageInternal cmd, ->

        hActor.onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.INVALID_ATTR
          done()

      it "should return OK if hMessage respect \"gte\" filter with multiple hCondition", (done) ->
        cmd.payload.params = gte:
          priority: 2
          timeout: 10000

        hMsg.priority = 2
        hActor.onMessageInternal cmd, ->

        hActor.onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.OK
          done()

      it "should return OK if hMessage respect \"gte\" filter ", (done) ->
        cmd.payload.params = gte:
          "payload.params.priority": 2

        hMsg.payload.params = {}
        hMsg.payload.params.priority = 2
        hActor.onMessageInternal cmd, ->

        hActor.onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.OK
          done()


    describe "#ltFilter()", ->
      it "should return INVALID_ATTR if hMessage don't respect \"lt\" filter", (done) ->
        cmd.payload.params = lt:
          priority: 2

        hMsg.priority = 3
        hActor.onMessageInternal cmd, ->

        hActor.onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.INVALID_ATTR
          done()

      it "should return INVALID_ATTR if a bad attribute of hMessage is use", (done) ->
        cmd.payload.params = lt:
          attribut: 12

        hActor.onMessageInternal cmd, ->

        hActor.onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.INVALID_ATTR
          done()

      it "should return INVALID_ATTR if an attribute is not a number", (done) ->
        cmd.payload.params = lt:
          priority: "not a number"

        hActor.onMessageInternal cmd, ->

        hActor.onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.INVALID_ATTR
          done()

      it "should return INVALID_ATTR if hMessage don't respect \"lt\" filter with multiple hCondition", (done) ->
        cmd.payload.params = lt:
          priority: 2
          timeout: 10000

        hMsg.priority = 2
        hMsg.timeout = 10001
        hActor.onMessageInternal cmd, ->

        hActor.onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.INVALID_ATTR
          done()

      it "should return OK if hMessage respect \"lt\" filter with multiple hCondition", (done) ->
        cmd.payload.params = lt:
          priority: 2
          timeout: 10000

        hMsg.priority = 1
        hMsg.timeout = 9999
        hActor.onMessageInternal cmd, ->

        hActor.onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.OK
          done()

      it "should return OK if hMessage respect \"lt\" filter ", (done) ->
        cmd.payload.params = lt:
          "payload.params.priority": 2

        hMsg.payload.params = {}
        hMsg.payload.params.priority = 1
        hActor.onMessageInternal cmd, ->

        hActor.onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.OK
          done()


    describe "#lteFilter()", ->
      it "should return INVALID_ATTR if hMessage don't respect \"lte\" filter", (done) ->
        cmd.payload.params = lte:
          priority: 2

        hMsg.priority = 3
        hActor.onMessageInternal cmd, ->

        hActor.onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.INVALID_ATTR
          done()

      it "should return INVALID_ATTR if a bad attribute of hMessage is use", (done) ->
        cmd.payload.params = lte:
          attribut: 12

        hActor.onMessageInternal cmd, ->

        hActor.onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.INVALID_ATTR
          done()

      it "should return INVALID_ATTR if an attribute is not a number", (done) ->
        cmd.payload.params = lte:
          priority: "not a number"

        hActor.onMessageInternal cmd, ->

        hActor.onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.INVALID_ATTR
          done()

      it "should return INVALID_ATTR if hMessage don't respect \"lte\" filter with multiple hCondition", (done) ->
        cmd.payload.params = lte:
          priority: 2
          timeout: 10000

        hMsg.priority = 1
        hMsg.timeout = 10001
        hActor.onMessageInternal cmd, ->

        hActor.onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.INVALID_ATTR
          done()

      it "should return OK if hMessage respect \"lte\" filter with multiple hCondition", (done) ->
        cmd.payload.params = lte:
          priority: 2
          timeout: 10000

        hMsg.priority = 1
        hMsg.timeout = 10000
        hActor.onMessageInternal cmd, ->

        hActor.onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.OK
          done()

      it "should return OK if hMessage respect \"lte\" filter ", (done) ->
        cmd.payload.params = lte:
          "payload.params.priority": 2

        hMsg.payload.params = {}
        hMsg.payload.params.priority = 2
        hActor.onMessageInternal cmd, ->

        hActor.onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.OK
          done()


    describe "#inFilter()", ->
      it "should return INVALID_ATTR if hMessage don't respect \"in\" filter", (done) ->
        cmd.payload.params = in:
          publisher: ["u2@localhost", "u3@localhost"]

        hActor.onMessageInternal cmd, ->

        hActor.onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.INVALID_ATTR
          done()

      it "should return INVALID_ATTR if a bad attribute of hMessage is use", (done) ->
        cmd.payload.params = in:
          attribut: "bad"

        hActor.onMessageInternal cmd, ->

        hActor.onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.INVALID_ATTR
          done()

      it "should return INVALID_ATTR if the attribute is not a array", (done) ->
        cmd.payload.params = in:
          publisher: "u1@localhost"

        hActor.onMessageInternal cmd, ->

        hActor.onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.INVALID_ATTR
          done()

      it "should return INVALID_ATTR if hMessage don't respect \"in\" filter with multiple hCondition", (done) ->
        cmd.payload.params = in:
          publisher: ["u1@localhost"]
          author: ["u2@localhost"]

        hMsg.author = "u1@localhost"
        hActor.onMessageInternal cmd, ->

        hActor.onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.INVALID_ATTR
          done()

      it "should return OK if hMessage respect \"in\" filter with multiple hCondition", (done) ->
        cmd.payload.params = in:
          publisher: ["u1@localhost"]
          author: ["u2@localhost"]

        hMsg.author = "u2@localhost"
        hActor.onMessageInternal cmd, ->

        hActor.onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.OK
          done()

      it "should return OK if hMessage respect \"in\" filter ", (done) ->
        cmd.payload.params = in:
          "payload.params.priority": [2, 3]

        hMsg.payload.params = {}
        hMsg.payload.params.priority = 2
        hActor.onMessageInternal cmd, ->

        hActor.onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.OK
          done()


    describe "#ninFilter()", ->
      it "should return INVALID_ATTR if hMessage don't respect \"nin\" filter", (done) ->
        cmd.payload.params = nin:
          publisher: ["u2@localhost", "u1@localhost"]

        hActor.onMessageInternal cmd, ->

        hActor.onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.INVALID_ATTR
          done()

      it "should return INVALID_ATTR if a bad attribute of hMessage is use", (done) ->
        cmd.payload.params = nin:
          attribut: ["u2@localhost", "u1@localhost"]

        hActor.onMessageInternal cmd, ->

        hActor.onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.INVALID_ATTR
          done()

      it "should return INVALID_ATTR if the attribute is not a array", (done) ->
        cmd.payload.params = nin:
          publisher: "u2@localhost"

        hActor.onMessageInternal cmd, ->

        hActor.onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.INVALID_ATTR
          done()

      it "should return INVALID_ATTR if hMessage don't respect \"nin\" filter with multiple hCondition", (done) ->
        cmd.payload.params = nin:
          publisher: ["u2@localhost"]
          author: ["u1@localhost"]

        hMsg.author = "u1@localhost"
        hActor.onMessageInternal cmd, ->

        hActor.onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.INVALID_ATTR
          done()

      it "should return OK if hMessage respect \"nin\" filter with multiple hCondition", (done) ->
        cmd.payload.params = nin:
          publisher: ["u2@localhost"]
          author: ["u1@localhost"]

        hMsg.author = "u2@localhost"
        hActor.onMessageInternal cmd, ->

        hActor.onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.OK
          done()

      it "should return OK if hMessage respect \"nin\" filter ", (done) ->
        cmd.payload.params = nin:
          "payload.params.priority": [2, 3]

        hMsg.payload.params = {}
        hMsg.payload.params.priority = 4
        hActor.onMessageInternal cmd, ->

        hActor.onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.OK
          done()


    describe "#andFilter()", ->
      it "should return INVALID_ATTR if hMessage don't respect \"and\" filter", (done) ->
        cmd.payload.params = and: [
          in:
            publisher: ["u2@localhost", "u1@localhost"]
        ,
          nin:
            author: ["u2@localhost", "u1@localhost"]
        ]
        hMsg.author = "u1@localhost"
        hActor.onMessageInternal cmd, ->

        hActor.onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.INVALID_ATTR
          done()

      it "should return INVALID_ATTR if a bad attribute of hMessage is use", (done) ->
        cmd.payload.params = and: [
          in:
            publisher: ["u2@localhost", "u1@localhost"]
        ,
          nin:
            attribut: ["u2@localhost", "u1@localhost"]
        ]
        hActor.onMessageInternal cmd, ->

        hActor.onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.INVALID_ATTR
          done()

      it "should return INVALID_ATTR if the \"and\" attribute is not a array", (done) ->
        cmd.payload.params = and:
          in:
            publisher: ["u2@localhost", "u1@localhost"]

          nin:
            attribut: ["u2@localhost", "u1@localhost"]

        hActor.onMessageInternal cmd, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.INVALID_ATTR
          done()

      it "should return OK if hMessage respect \"and\" filter with multiple hCondition", (done) ->
        cmd.payload.params = and: [
          in:
            publisher: ["u2@localhost", "u1@localhost"]
        ,
          nin:
            author: ["u2@localhost", "u1@localhost"]
        ]
        hMsg.author = "u3@localhost"
        hActor.onMessageInternal cmd, ->

        hActor.onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.OK
          done()

      it "should return OK if hMessage respect \"and\" filter ", (done) ->
        cmd.payload.params = and: [
          eq:
            "payload.params.priority": 2
        ,
          nin:
            author: ["u2@localhost", "u1@localhost"]
        ]
        hMsg.author = "u3@localhost"
        hMsg.payload.params = {}
        hMsg.payload.params.priority = 2
        hActor.onMessageInternal cmd, ->

        hActor.onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.OK
          done()


    describe "#orFilter()", ->
      it "should return INVALID_ATTR if hMessage don't respect \"or\" filter", (done) ->
        cmd.payload.params = or: [
          in:
            publisher: ["u2@localhost", "u3@localhost"]
        ,
          nin:
            author: ["u2@localhost", "u1@localhost"]
        ]
        hMsg.author = "u1@localhost"
        hActor.onMessageInternal cmd, ->

        hActor.onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.INVALID_ATTR
          done()

      it "should return INVALID_ATTR if a bad attribute of hMessage is use", (done) ->
        cmd.payload.params = or: [
          in:
            publisher: ["u2@localhost", "u3@localhost"]
        ,
          nin:
            attribut: ["u2@localhost", "u1@localhost"]
        ]
        hActor.onMessageInternal cmd, ->

        hActor.onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.INVALID_ATTR
          done()

      it "should return INVALID_ATTR if the \"or\" attribute is not a array", (done) ->
        cmd.payload.params = or:
          in:
            publisher: ["u2@localhost", "u1@localhost"]

          nin:
            attribut: ["u2@localhost", "u1@localhost"]

        hActor.onMessageInternal cmd, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.INVALID_ATTR
          done()

      it "should return OK if hMessage respect \"or\" filter with multiple hCondition", (done) ->
        cmd.payload.params = or: [
          in:
            publisher: ["u2@localhost", "u1@localhost"]
        ,
          nin:
            author: ["u2@localhost", "u1@localhost"]
        ]
        hMsg.author = "u1@localhost"
        hActor.onMessageInternal cmd, ->

        hActor.onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.OK
          done()

      it "should return OK if hMessage respect \"or\" filter ", (done) ->
        cmd.payload.params = or: [
          eq:
            "payload.params.priority": 2
        ,
          nin:
            author: ["u2@localhost", "u1@localhost"]
        ]
        hMsg.author = "u3@localhost"
        hMsg.payload.params = {}
        hMsg.payload.params.priority = 3
        hActor.onMessageInternal cmd, ->

        hActor.onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.OK
          done()


    describe "#norFilter()", ->
      it "should return INVALID_ATTR if hMessage don't respect \"nor\" filter", (done) ->
        cmd.payload.params = nor: [
          in:
            publisher: ["u2@localhost", "u3@localhost"]
        ,
          nin:
            author: ["u2@localhost", "u1@localhost"]
        ]
        hMsg.author = "u3@localhost"
        hActor.onMessageInternal cmd, ->

        hActor.onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.INVALID_ATTR
          done()

      it "should return INVALID_ATTR if the \"nor\" attribute is not a array", (done) ->
        cmd.payload.params = nor:
          in:
            publisher: ["u2@localhost", "u3@localhost"]

          nin:
            attribut: ["u2@localhost", "u1@localhost"]

        hActor.onMessageInternal cmd, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.INVALID_ATTR
          done()

      it "should return OK if hMessage respect \"nor\" filter with multiple hCondition", (done) ->
        cmd.payload.params = nor: [
          in:
            publisher: ["u2@localhost", "u3@localhost"]
        ,
          nin:
            author: ["u2@localhost", "u1@localhost"]
        ]
        hMsg.author = "u1@localhost"
        hActor.onMessageInternal cmd, ->

        hActor.onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.OK
          done()

      it "should return OK if hMessage respect \"nor\" filter ", (done) ->
        cmd.payload.params = nor: [
          eq:
            "payload.params.priority": 2
        ,
          nin:
            author: ["u2@localhost", "u1@localhost"]
        ]
        hMsg.author = "u2@localhost"
        hMsg.payload.params = {}
        hMsg.payload.params.priority = 3
        hActor.onMessageInternal cmd, ->

        hActor.onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.OK
          done()


    describe "#notFilter()", ->
      it "should return INVALID_ATTR if hMessage don't respect \"not\" filter", (done) ->
        cmd.payload.params = not:
          in:
            publisher: ["u2@localhost", "u1@localhost"]

        hActor.onMessageInternal cmd, ->

        hActor.onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.INVALID_ATTR
          done()

      it "should return INVALID_ATTR if hMessage don't respect \"not\" filter with multiple hCondition", (done) ->
        cmd.payload.params = not:
          in:
            publisher: ["u2@localhost", "u1@localhost"]

          eq:
            priority: 2

        hMsg.priority = 2
        hActor.onMessageInternal cmd, ->

        hActor.onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.INVALID_ATTR
          done()

      it "should return OK if hMessage respect \"not\" filter with multiple hCondition", (done) ->
        cmd.payload.params = not:
          in:
            publisher: ["u2@localhost", "u3@localhost"]

          nin:
            author: ["u2@localhost", "u1@localhost"]

        hMsg.author = "u2@localhost"
        hActor.onMessageInternal cmd, ->

        hActor.onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.OK
          done()

      it "should return OK if hMessage respect \"not\" filter ", (done) ->
        cmd.payload.params = not:
          eq:
            "payload.params.priority": 2

          in:
            author: ["u2@localhost", "u1@localhost"]

        hMsg.author = "u3@localhost"
        hMsg.payload.params = {}
        hMsg.payload.params.priority = 3
        hActor.onMessageInternal cmd, ->

        hActor.onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.OK
          done()


    describe "#relevantFilter()", ->
      it "should return INVALID_ATTR if hMessage don't respect true \"relevant\" filter", (done) ->
        cmd.payload.params = relevant: true
        hMsg.relevance = new Date(79, 5, 24, 11, 33, 0)
        hActor.onMessageInternal cmd, ->

        hActor.onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.INVALID_ATTR
          done()

      it "should return INVALID_ATTR if hMessage don't respect false \"relevant\" filter", (done) ->
        cmd.payload.params = relevant: false
        hMsg.relevance = new Date(2024, 5, 24, 11, 33, 0)
        hActor.onMessageInternal cmd, ->

        hActor.onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.INVALID_ATTR
          done()

      it "should return INVALID_ATTR if attribute relevance of hMessage is not set", (done) ->
        cmd.payload.params = relevant: false
        hActor.onMessageInternal cmd, ->

        hActor.onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.INVALID_ATTR
          done()

      it "should return INVALID_ATTR if attribute relevance of hMessage is incorrect", (done) ->
        cmd.payload.params = relevant: false
        hMsg.relevance = "wrong date"
        hActor.onMessageInternal cmd, ->

        hActor.onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.INVALID_ATTR
          done()

      it "should return OK if hMessage respect \"relevance\" filter ", (done) ->
        cmd.payload.params = relevant: true
        hMsg.relevance = new Date(2024, 5, 24, 11, 33, 0)
        hActor.onMessageInternal cmd, ->

        hActor.onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.OK
          done()

      it "should return OK if hMessage respect false \"relevance\" filter ", (done) ->
        cmd.payload.params = relevant: false
        hMsg.relevance = new Date(75, 5, 24, 11, 33, 0)
        hActor.onMessageInternal cmd, ->

        hActor.onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.OK
          done()


    describe "#geoFilter()", ->
      it "should return INVALID_ATTR if hMessage don't respect \"geo\" filter", (done) ->
        cmd.payload.params = geo:
          lat: 12
          lng: 24
          radius: 10000

        hMsg.location = {}
        hMsg.location.pos =
          lat: 24
          lng: 12

        hActor.onMessageInternal cmd, ->

        hActor.onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.INVALID_ATTR
          done()

      it "should return INVALID_ATTR if attribut radius is missing in filter", (done) ->
        cmd.payload.params = geo:
          lat: 12
          lng: 24

        hMsg.location = {}
        hMsg.location.pos =
          lat: 24
          lng: 12

        hActor.onMessageInternal cmd, ->

        hActor.onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.INVALID_ATTR
          done()

      it "should return INVALID_ATTR if attribut lat/lng is not a number", (done) ->
        cmd.payload.params = geo:
          lat: 24
          lng: "NaN"
          radius: 10000

        hMsg.location = {}
        hMsg.location.pos =
          lat: 24
          lng: 12

        hActor.onMessageInternal cmd, ->

        hActor.onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.INVALID_ATTR
          done()

      it "should return INVALID_ATTR if attribut lat/lng of hMessage is not a number", (done) ->
        cmd.payload.params = geo:
          lat: 24
          lng: 12
          radius: 10000

        hMsg.location = {}
        hMsg.location.pos =
          lat: 12
          lng: "NaN"

        hActor.onMessageInternal cmd, ->

        hActor.onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.INVALID_ATTR
          done()

      it "should return OK if hMessage respect \"geo\" filter", (done) ->
        cmd.payload.params = geo:
          lat: 24
          lng: 12
          radius: 10000

        hMsg.location = {}
        hMsg.location.pos =
          lat: 23
          lng: 12

        hActor.onMessageInternal cmd, ->

        hActor.onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.INVALID_ATTR
          done()


    describe "#booleanFilter()", ->
      it "should return INVALID_ATTR if filter boolean = false", (done) ->
        cmd.payload.params = boolean: false
        hActor.onMessageInternal cmd, ->

        hActor.onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.INVALID_ATTR
          done()

      it "should return OK if filter boolean = true", (done) ->
        cmd.payload.params = boolean: true
        hActor.onMessageInternal cmd, ->

        hActor.onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.OK
          done()

      it "should return INVALID_ATTR if attribute boolean is not a boolean", (done) ->
        cmd.payload.params = boolean: "string"
        hActor.onMessageInternal cmd, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.INVALID_ATTR
          done()
