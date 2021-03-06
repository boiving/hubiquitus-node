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
  actorModule = require("../lib/actor/hactor")

  describe "#FilterMessage()", ->
    hMsg = undefined
    filter = undefined

    before () ->
      topology = {
        actor: config.logins[0].jid,
        type: "hactor"
      }
      hActor = actorModule.newActor(topology)

    after () ->
      hActor.h_tearDown()
      hActor = null

    beforeEach ->
      filter = {}
      hMsg = config.makeHMessage(hActor.actor, config.logins[0].jid, "string", {})

    it "should return Ok if empty filter", (done) ->
      hActor.h_onMessageInternal hMsg, (hMessage) ->
        hMessage.should.have.property "type", "hResult"
        hMessage.payload.should.have.property "status", hResultStatus.OK
        done()


    describe "#eqFilter()", ->
      it "should return INVALID_ATTR if hMessage don't respect \"eq\" filter", (done) ->
        filter = eq:
          priority: 2

        hMsg.priority = 3
        hActor.setFilter filter

        hActor.h_onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.INVALID_ATTR
          done()

      it "should return INVALID_ATTR if a bad attribute of hMessage is use", (done) ->
        filter = eq:
          attribut: "bad"

        hActor.setFilter filter

        hActor.h_onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.INVALID_ATTR
          done()

      it "should return INVALID_ATTR if hMessage don't respect \"eq\" filter with multiple hCondition", (done) ->
        filter = eq:
          priority: 2
          author: config.logins[0].jid

        hMsg.priority = 2
        hMsg.author = config.logins[1].jid
        hActor.setFilter filter

        hActor.h_onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.INVALID_ATTR
          done()

      it "should return OK if hMessage respect \"eq\" filter with multiple hCondition", (done) ->
        filter = eq:
          priority: 2
          author: config.logins[0].jid

        hMsg.priority = 2
        hMsg.author = config.logins[0].jid
        hActor.setFilter filter

        hActor.h_onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.OK
          done()

      it "should return OK if hMessage respect \"eq\" filter ", (done) ->
        filter = eq:
          "payload.priority": 2

        hMsg.payload.priority = 2
        hActor.setFilter filter

        hActor.h_onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.OK
          done()


    describe "#neFilter()", ->
      it "should return INVALID_ATTR if hMessage don't respect \"ne\" filter", (done) ->
        filter = ne:
          priority: 2

        hMsg.priority = 2
        hActor.setFilter filter

        hActor.h_onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.INVALID_ATTR
          done()

      it "should return INVALID_ATTR if a bad attribute of hMessage is use", (done) ->
        filter = ne:
          attribut: "bad"

        hActor.setFilter filter

        hActor.h_onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.INVALID_ATTR
          done()

      it "should return INVALID_ATTR if hMessage don't respect \"ne\" filter with multiple hCondition", (done) ->
        filter = ne:
          priority: 2
          author: config.logins[0].jid

        hMsg.priority = 3
        hMsg.author = config.logins[0].jid
        hActor.setFilter filter

        hActor.h_onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.INVALID_ATTR
          done()

      it "should return OK if hMessage respect \"ne\" filter with multiple hCondition", (done) ->
        filter = ne:
          priority: 2
          author: config.logins[0].jid

        hMsg.priority = 3
        hMsg.author = config.logins[1].jid
        hActor.setFilter filter

        hActor.h_onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.OK
          done()

      it "should return OK if hMessage respect \"ne\" filter ", (done) ->
        filter = ne:
          "payload.priority": 2

        hMsg.payload.priority = 3
        hActor.setFilter filter

        hActor.h_onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.OK
          done()


    describe "#gtFilter()", ->
      it "should return INVALID_ATTR if hMessage don't respect \"gt\" filter", (done) ->
        filter = gt:
          priority: 2

        hMsg.priority = 2
        hActor.setFilter filter

        hActor.h_onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.INVALID_ATTR
          done()

      it "should return INVALID_ATTR if a bad attribute of hMessage is use", (done) ->
        filter = gt:
          attribut: 12

        hActor.setFilter filter

        hActor.h_onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.INVALID_ATTR
          done()

      it "should return INVALID_ATTR if an attribute is not a number", (done) ->
        filter = gt:
          priority: "not a number"

        hActor.setFilter filter

        hActor.h_onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.INVALID_ATTR
          done()

      it "should return INVALID_ATTR if hMessage don't respect \"gt\" filter with multiple hCondition", (done) ->
        filter = gt:
          priority: 2
          timeout: 10000

        hMsg.priority = 3
        hMsg.timeout = 9999
        hActor.setFilter filter

        hActor.h_onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.INVALID_ATTR
          done()

      it "should return OK if hMessage respect \"gt\" filter with multiple hCondition", (done) ->
        filter = gt:
          priority: 2
          timeout: 10000

        hMsg.priority = 3
        hActor.setFilter filter

        hActor.h_onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.OK
          done()

      it "should return OK if hMessage respect \"gt\" filter ", (done) ->
        filter = gt:
          "payload.priority": 2

        hMsg.payload.priority = 3
        hActor.setFilter filter

        hActor.h_onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.OK
          done()


    describe "#gteFilter()", ->
      it "should return INVALID_ATTR if hMessage don't respect \"gte\" filter", (done) ->
        filter = gte:
          priority: 2

        hMsg.priority = 1
        hActor.setFilter filter

        hActor.h_onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.INVALID_ATTR
          done()

      it "should return INVALID_ATTR if a bad attribute of hMessage is use", (done) ->
        filter = gte:
          attribut: 12

        hActor.setFilter filter

        hActor.h_onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.INVALID_ATTR
          done()

      it "should return INVALID_ATTR if an attribute is not a number", (done) ->
        filter = gte:
          priority: "not a number"

        hActor.setFilter filter

        hActor.h_onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.INVALID_ATTR
          done()

      it "should return INVALID_ATTR if hMessage don't respect \"gte\" filter with multiple hCondition", (done) ->
        filter = gte:
          priority: 2
          timeout: 10000

        hMsg.priority = 2
        hMsg.timeout = 9999
        hActor.setFilter filter

        hActor.h_onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.INVALID_ATTR
          done()

      it "should return OK if hMessage respect \"gte\" filter with multiple hCondition", (done) ->
        filter = gte:
          priority: 2
          timeout: 10000

        hMsg.priority = 2
        hActor.setFilter filter

        hActor.h_onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.OK
          done()

      it "should return OK if hMessage respect \"gte\" filter ", (done) ->
        filter = gte:
          "payload.params.priority": 2

        hMsg.payload.params = {}
        hMsg.payload.params.priority = 2
        hActor.setFilter filter

        hActor.h_onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.OK
          done()


    describe "#ltFilter()", ->
      it "should return INVALID_ATTR if hMessage don't respect \"lt\" filter", (done) ->
        filter = lt:
          priority: 2

        hMsg.priority = 3
        hActor.setFilter filter

        hActor.h_onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.INVALID_ATTR
          done()

      it "should return INVALID_ATTR if a bad attribute of hMessage is use", (done) ->
        filter = lt:
          attribut: 12

        hActor.setFilter filter

        hActor.h_onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.INVALID_ATTR
          done()

      it "should return INVALID_ATTR if an attribute is not a number", (done) ->
        filter = lt:
          priority: "not a number"

        hActor.setFilter filter

        hActor.h_onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.INVALID_ATTR
          done()

      it "should return INVALID_ATTR if hMessage don't respect \"lt\" filter with multiple hCondition", (done) ->
        filter = lt:
          priority: 2
          timeout: 10000

        hMsg.priority = 2
        hMsg.timeout = 10001
        hActor.setFilter filter

        hActor.h_onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.INVALID_ATTR
          done()

      it "should return OK if hMessage respect \"lt\" filter with multiple hCondition", (done) ->
        filter = lt:
          priority: 2
          timeout: 10000

        hMsg.priority = 1
        hMsg.timeout = 9999
        hActor.setFilter filter

        hActor.h_onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.OK
          done()

      it "should return OK if hMessage respect \"lt\" filter ", (done) ->
        filter = lt:
          "payload.params.priority": 2

        hMsg.payload.params = {}
        hMsg.payload.params.priority = 1
        hActor.setFilter filter

        hActor.h_onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.OK
          done()


    describe "#lteFilter()", ->
      it "should return INVALID_ATTR if hMessage don't respect \"lte\" filter", (done) ->
        filter = lte:
          priority: 2

        hMsg.priority = 3
        hActor.setFilter filter

        hActor.h_onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.INVALID_ATTR
          done()

      it "should return INVALID_ATTR if a bad attribute of hMessage is use", (done) ->
        filter = lte:
          attribut: 12

        hActor.setFilter filter

        hActor.h_onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.INVALID_ATTR
          done()

      it "should return INVALID_ATTR if an attribute is not a number", (done) ->
        filter = lte:
          priority: "not a number"

        hActor.setFilter filter

        hActor.h_onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.INVALID_ATTR
          done()

      it "should return INVALID_ATTR if hMessage don't respect \"lte\" filter with multiple hCondition", (done) ->
        filter = lte:
          priority: 2
          timeout: 10000

        hMsg.priority = 1
        hMsg.timeout = 10001
        hActor.setFilter filter

        hActor.h_onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.INVALID_ATTR
          done()

      it "should return OK if hMessage respect \"lte\" filter with multiple hCondition", (done) ->
        filter = lte:
          priority: 2
          timeout: 10000

        hMsg.priority = 1
        hMsg.timeout = 10000
        hActor.setFilter filter

        hActor.h_onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.OK
          done()

      it "should return OK if hMessage respect \"lte\" filter ", (done) ->
        filter = lte:
          "payload.params.priority": 2

        hMsg.payload.params = {}
        hMsg.payload.params.priority = 2
        hActor.setFilter filter

        hActor.h_onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.OK
          done()


    describe "#inFilter()", ->
      it "should return INVALID_ATTR if hMessage don't respect \"in\" filter", (done) ->
        filter = in:
          publisher: ["u2@localhost", "u3@localhost"]

        hActor.setFilter filter

        hActor.h_onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.INVALID_ATTR
          done()

      it "should return INVALID_ATTR if a bad attribute of hMessage is use", (done) ->
        filter = in:
          attribut: "bad"

        hActor.setFilter filter

        hActor.h_onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.INVALID_ATTR
          done()

      it "should return INVALID_ATTR if the attribute is not a array", (done) ->
        filter = in:
          publisher: "u1@localhost"

        hActor.setFilter filter

        hActor.h_onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.INVALID_ATTR
          done()

      it "should return INVALID_ATTR if hMessage don't respect \"in\" filter with multiple hCondition", (done) ->
        filter = in:
          publisher: ["u1@localhost"]
          author: ["u2@localhost"]

        hMsg.author = "u1@localhost"
        hActor.setFilter filter

        hActor.h_onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.INVALID_ATTR
          done()

      it "should return OK if hMessage respect \"in\" filter with multiple hCondition", (done) ->
        filter = in:
          publisher: ["u1@localhost"]
          author: ["u2@localhost"]

        hMsg.author = "u2@localhost"
        hActor.setFilter filter

        hActor.h_onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.OK
          done()

      it "should return OK if hMessage respect \"in\" filter ", (done) ->
        filter = in:
          "payload.params.priority": [2, 3]

        hMsg.payload.params = {}
        hMsg.payload.params.priority = 2
        hActor.setFilter filter

        hActor.h_onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.OK
          done()


    describe "#ninFilter()", ->
      it "should return INVALID_ATTR if hMessage don't respect \"nin\" filter", (done) ->
        filter = nin:
          publisher: ["u2@localhost", "u1@localhost"]

        hActor.setFilter filter

        hActor.h_onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.INVALID_ATTR
          done()

      it "should return INVALID_ATTR if a bad attribute of hMessage is use", (done) ->
        filter = nin:
          attribut: ["u2@localhost", "u1@localhost"]

        hActor.setFilter filter

        hActor.h_onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.INVALID_ATTR
          done()

      it "should return INVALID_ATTR if the attribute is not a array", (done) ->
        filter = nin:
          publisher: "u2@localhost"

        hActor.setFilter filter

        hActor.h_onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.INVALID_ATTR
          done()

      it "should return INVALID_ATTR if hMessage don't respect \"nin\" filter with multiple hCondition", (done) ->
        filter = nin:
          publisher: ["u2@localhost"]
          author: ["u1@localhost"]

        hMsg.author = "u1@localhost"
        hActor.setFilter filter

        hActor.h_onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.INVALID_ATTR
          done()

      it "should return OK if hMessage respect \"nin\" filter with multiple hCondition", (done) ->
        filter = nin:
          publisher: ["u2@localhost"]
          author: ["u1@localhost"]

        hMsg.author = "u2@localhost"
        hActor.setFilter filter

        hActor.h_onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.OK
          done()

      it "should return OK if hMessage respect \"nin\" filter ", (done) ->
        filter = nin:
          "payload.params.priority": [2, 3]

        hMsg.payload.params = {}
        hMsg.payload.params.priority = 4
        hActor.setFilter filter

        hActor.h_onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.OK
          done()


    describe "#andFilter()", ->
      it "should return INVALID_ATTR if hMessage don't respect \"and\" filter", (done) ->
        filter = and: [
          in:
            publisher: ["u2@localhost", "u1@localhost"]
        ,
          nin:
            author: ["u2@localhost", "u1@localhost"]
        ]
        hMsg.author = "u1@localhost"
        hActor.setFilter filter

        hActor.h_onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.INVALID_ATTR
          done()

      it "should return INVALID_ATTR if a bad attribute of hMessage is use", (done) ->
        filter = and: [
          in:
            publisher: ["u2@localhost", "u1@localhost"]
        ,
          nin:
            attribut: ["u2@localhost", "u1@localhost"]
        ]
        hActor.setFilter filter

        hActor.h_onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.INVALID_ATTR
          done()

      it "should return OK if hMessage respect \"and\" filter with multiple hCondition", (done) ->
        filter = and: [
          in:
            publisher: ["u2@localhost", "u1@localhost"]
        ,
          nin:
            author: ["u2@localhost", "u1@localhost"]
        ]
        hMsg.author = "u3@localhost"
        hActor.setFilter filter

        hActor.h_onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.OK
          done()

      it "should return OK if hMessage respect \"and\" filter ", (done) ->
        filter = and: [
          eq:
            "payload.params.priority": 2
        ,
          nin:
            author: ["u2@localhost", "u1@localhost"]
        ]
        hMsg.author = "u3@localhost"
        hMsg.payload.params = {}
        hMsg.payload.params.priority = 2
        hActor.setFilter filter

        hActor.h_onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.OK
          done()


    describe "#orFilter()", ->
      it "should return INVALID_ATTR if hMessage don't respect \"or\" filter", (done) ->
        filter = or: [
          in:
            publisher: ["u2@localhost", "u3@localhost"]
        ,
          nin:
            author: ["u2@localhost", "u1@localhost"]
        ]
        hMsg.author = "u1@localhost"
        hActor.setFilter filter

        hActor.h_onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.INVALID_ATTR
          done()

      it "should return INVALID_ATTR if a bad attribute of hMessage is use", (done) ->
        filter = or: [
          in:
            publisher: ["u2@localhost", "u3@localhost"]
        ,
          nin:
            attribut: ["u2@localhost", "u1@localhost"]
        ]
        hActor.setFilter filter

        hActor.h_onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.INVALID_ATTR
          done()

      it "should return OK if hMessage respect \"or\" filter with multiple hCondition", (done) ->
        filter = or: [
          in:
            publisher: ["u2@localhost", "u1@localhost"]
        ,
          nin:
            author: ["u2@localhost", "u1@localhost"]
        ]
        hMsg.author = "u1@localhost"
        hActor.setFilter filter

        hActor.h_onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.OK
          done()

      it "should return OK if hMessage respect \"or\" filter ", (done) ->
        filter = or: [
          eq:
            "payload.params.priority": 2
        ,
          nin:
            author: ["u2@localhost", "u1@localhost"]
        ]
        hMsg.author = "u3@localhost"
        hMsg.payload.params = {}
        hMsg.payload.params.priority = 3
        hActor.setFilter filter

        hActor.h_onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.OK
          done()


    describe "#norFilter()", ->
      it "should return INVALID_ATTR if hMessage don't respect \"nor\" filter", (done) ->
        filter = nor: [
          in:
            publisher: ["u2@localhost", "u3@localhost"]
        ,
          nin:
            author: ["u2@localhost", "u1@localhost"]
        ]
        hMsg.author = "u3@localhost"
        hActor.setFilter filter

        hActor.h_onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.INVALID_ATTR
          done()

      it "should return OK if hMessage respect \"nor\" filter with multiple hCondition", (done) ->
        filter = nor: [
          in:
            publisher: ["u2@localhost", "u3@localhost"]
        ,
          nin:
            author: ["u2@localhost", "u1@localhost"]
        ]
        hMsg.author = "u1@localhost"
        hActor.setFilter filter

        hActor.h_onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.OK
          done()

      it "should return OK if hMessage respect \"nor\" filter ", (done) ->
        filter = nor: [
          eq:
            "payload.params.priority": 2
        ,
          nin:
            author: ["u2@localhost", "u1@localhost"]
        ]
        hMsg.author = "u2@localhost"
        hMsg.payload.params = {}
        hMsg.payload.params.priority = 3
        hActor.setFilter filter

        hActor.h_onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.OK
          done()


    describe "#notFilter()", ->
      it "should return INVALID_ATTR if hMessage don't respect \"not\" filter", (done) ->
        filter = not:
          in:
            publisher: ["u2@localhost", "u1@localhost"]

        hActor.setFilter filter

        hActor.h_onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.INVALID_ATTR
          done()

      it "should return INVALID_ATTR if hMessage don't respect \"not\" filter with multiple hCondition", (done) ->
        filter = not:
          in:
            publisher: ["u2@localhost", "u1@localhost"]

          eq:
            priority: 2

        hMsg.priority = 2
        hActor.setFilter filter

        hActor.h_onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.INVALID_ATTR
          done()

      it "should return OK if hMessage respect \"not\" filter with multiple hCondition", (done) ->
        filter = not:
          in:
            publisher: ["u2@localhost", "u3@localhost"]

          nin:
            author: ["u2@localhost", "u1@localhost"]

        hMsg.author = "u2@localhost"
        hActor.setFilter filter

        hActor.h_onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.OK
          done()

      it "should return OK if hMessage respect \"not\" filter ", (done) ->
        filter = not:
          eq:
            "payload.params.priority": 2

          in:
            author: ["u2@localhost", "u1@localhost"]

        hMsg.author = "u3@localhost"
        hMsg.payload.params = {}
        hMsg.payload.params.priority = 3
        hActor.setFilter filter

        hActor.h_onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.OK
          done()


    describe "#relevantFilter()", ->
      it "should return INVALID_ATTR if hMessage don't respect true \"relevant\" filter", (done) ->
        filter = relevant: true
        hMsg.relevance = new Date(79, 5, 24, 11, 33, 0).getTime()
        hActor.setFilter filter

        hActor.h_onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.INVALID_ATTR
          done()

      it "should return INVALID_ATTR if hMessage don't respect false \"relevant\" filter", (done) ->
        filter = relevant: false
        hMsg.relevance = new Date(2024, 5, 24, 11, 33, 0).getTime()
        hActor.setFilter filter

        hActor.h_onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.INVALID_ATTR
          done()

      it "should return INVALID_ATTR if attribute relevance of hMessage is not set", (done) ->
        filter = relevant: false
        hActor.setFilter filter

        hActor.h_onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.INVALID_ATTR
          done()

      it "should return INVALID_ATTR if attribute relevance of hMessage is incorrect", (done) ->
        filter = relevant: false
        hMsg.relevance = "wrong date"
        hActor.setFilter filter

        hActor.h_onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.INVALID_ATTR
          done()

      it "should return OK if hMessage respect \"relevance\" filter ", (done) ->
        filter = relevant: true
        hMsg.relevance = new Date(2024, 5, 24, 11, 33, 0).getTime()
        hActor.setFilter filter

        hActor.h_onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.OK
          done()

      it "should return OK if hMessage respect false \"relevance\" filter ", (done) ->
        filter = relevant: false
        hMsg.relevance = new Date(75, 5, 24, 11, 33, 0).getTime()
        hActor.setFilter filter

        hActor.h_onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.OK
          done()


    describe "#geoFilter()", ->
      it "should return INVALID_ATTR if hMessage don't respect \"geo\" filter", (done) ->
        filter = geo:
          lat: 12
          lng: 24
          radius: 10000

        hMsg.location = {}
        hMsg.location.pos =
          lat: 24
          lng: 12

        hActor.setFilter filter

        hActor.h_onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.INVALID_ATTR
          done()

      it "should return INVALID_ATTR if attribut radius is missing in filter", (done) ->
        filter = geo:
          lat: 12
          lng: 24

        hMsg.location = {}
        hMsg.location.pos =
          lat: 24
          lng: 12

        hActor.setFilter filter

        hActor.h_onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.INVALID_ATTR
          done()

      it "should return INVALID_ATTR if attribut lat/lng is not a number", (done) ->
        filter = geo:
          lat: 24
          lng: "NaN"
          radius: 10000

        hMsg.location = {}
        hMsg.location.pos =
          lat: 24
          lng: 12

        hActor.setFilter filter

        hActor.h_onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.INVALID_ATTR
          done()

      it "should return INVALID_ATTR if attribut lat/lng of hMessage is not a number", (done) ->
        filter = geo:
          lat: 24
          lng: 12
          radius: 10000

        hMsg.location = {}
        hMsg.location.pos =
          lat: 12
          lng: "NaN"

        hActor.setFilter filter

        hActor.h_onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.INVALID_ATTR
          done()

      it "should return OK if hMessage respect \"geo\" filter", (done) ->
        filter = geo:
          lat: 24
          lng: 12
          radius: 10000

        hMsg.location = {}
        hMsg.location.pos =
          lat: 23
          lng: 12

        hActor.setFilter filter

        hActor.h_onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.INVALID_ATTR
          done()


    describe "#booleanFilter()", ->
      it "should return INVALID_ATTR if filter boolean = false", (done) ->
        filter = boolean: false
        hActor.setFilter filter

        hActor.h_onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.INVALID_ATTR
          done()

      it "should return OK if filter boolean = true", (done) ->
        filter = boolean: true
        hActor.setFilter filter

        hActor.h_onMessageInternal hMsg, (hMessage) ->
          hMessage.should.have.property "type", "hResult"
          hMessage.payload.should.have.property "status", hResultStatus.OK
          done()

