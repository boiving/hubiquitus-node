/*
 * Copyright (c) Novedia Group 2012.
 *
 *    This file is part of Hubiquitus
 *
 *    Permission is hereby granted, free of charge, to any person obtaining a copy
 *    of this software and associated documentation files (the "Software"), to deal
 *    in the Software without restriction, including without limitation the rights
 *    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
 *    of the Software, and to permit persons to whom the Software is furnished to do so,
 *    subject to the following conditions:
 *
 *    The above copyright notice and this permission notice shall be included in all copies
 *    or substantial portions of the Software.
 *
 *    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
 *    INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
 *    PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE
 *    FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
 *    ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 *
 *    You should have received a copy of the MIT License along with Hubiquitus.
 *    If not, see <http://opensource.org/licenses/mit-license.php>.
 */

var should = require('should');
var config = require('./_config.js');

describe('hRelevantMessages', function(){

    var hCommandController = new config.cmdController(config.cmdParams);
    var hClientConst = require('../lib/hClient.js').hClient;
    var hClient = new hClientConst(config.cmdParams);
    var status = require('../lib/codes.js').hResultStatus;
    var cmd;
    var nbMsgs = 10;
    var activeChan = config.getNewCHID();
    var notInPart = config.getNewCHID();
    var inactiveChan = config.getNewCHID();
    var emptyChannel = config.getNewCHID();


    before(config.beforeFN)

    after(config.afterFN)

    before(function(done){
        this.timeout(5000);
        config.createChannel(activeChan, [config.validJID], config.validJID, true, done);
    })

    for(var i = 0; i < nbMsgs; i++)
        before(function(done){
            config.publishMessage(config.validJID, activeChan, undefined, undefined, undefined, true, {
                relevance: new Date( new Date().getTime() + 100000 ) }, done);
        })

    for(var i = 0; i < nbMsgs; i++)
        before(function(done){
            config.publishMessage(config.validJID, activeChan, undefined, undefined, undefined, true, {
                relevance: new Date( new Date().getTime() - 100000 ) }, done);
        })

    for(var i = 0; i < nbMsgs; i++)
        before(function(done){
            config.publishMessage(config.validJID, activeChan, undefined, undefined, undefined, true, done);
        })

    before(function(done){
        this.timeout(5000);
        config.createChannel(emptyChannel, [config.validJID], config.validJID, true, done);
    })

    before(function(done){
        this.timeout(5000);
        config.createChannel(notInPart, ['a@b.com'], config.validJID, true, done);
    })

    before(function(done){
        this.timeout(5000);
        config.createChannel(inactiveChan, [config.validJID], config.validJID, false, done);
    })

    before(function(done){
        hClient.once('connect', done);
        hClient.connect(config.logins[0]);
    })

    after(function(done){
        hClient.once('disconnect', done);
        hClient.disconnect();
    })

    beforeEach(function(){
        cmd = config.makeHMessage(activeChan, config.logins[0].jid, 'hCommand',{});
        cmd.msgid = 'hCommandTest123';
        cmd.payload = {
                cmd : 'hRelevantMessages',
                params : {}
            }
    })

    it('should return hResult error MISSING_ATTR if actor is missing', function(done){
        delete cmd.actor;
        hClient.processMsgInternal(cmd, function(hMessage){
            hMessage.payload.should.have.property('status', status.MISSING_ATTR);
            hMessage.payload.result.should.match(/actor/);
            done();
        });
    })

    it('should return hResult error INVALID_ATTR with actor not a channel', function(done){
        cmd.actor = 'not a channel@localhost';
        hCommandController.execCommand(cmd, function(hMessage){
            hMessage.should.have.property('ref', cmd.msgid);
            hMessage.payload.should.have.property('status', status.INVALID_ATTR);
            hMessage.payload.should.have.property('result').and.match(/actor/);
            done();
        });
    })

    it('should return hResult error NOT_AVAILABLE if channel was not found', function(done){
        cmd.actor = '#this channel does not exist@localhost';
        hClient.processMsgInternal(cmd, function(hMessage){
            hMessage.payload.should.have.property('status', status.NOT_AVAILABLE);
            hMessage.payload.result.should.be.a('string');
            done();
        });
    })

    it('should return hResult error NOT_AUTHORIZED if not in subscribers list', function(done){
        cmd.actor = notInPart;
        hClient.processMsgInternal(cmd, function(hMessage){
            hMessage.payload.should.have.property('status', status.NOT_AUTHORIZED);
            hMessage.payload.result.should.be.a('string');
            done();
        });
    })

    it('should return hResult error NOT_AUTHORIZED if channel is inactive', function(done){
        cmd.actor = inactiveChan;
        hClient.processMsgInternal(cmd, function(hMessage){
            hMessage.payload.should.have.property('status', status.NOT_AUTHORIZED);
            hMessage.payload.result.should.be.a('string');
            done();
        });
    })

    it('should return hResult OK with an array of valid messages and without msgs missing relevance', function(done){
        hClient.processMsgInternal(cmd, function(hMessage){
            hMessage.payload.should.have.property('status', status.OK);
            hMessage.payload.result.length.should.be.eql(nbMsgs);

            for(var i = 0; i < hMessage.payload.result.length; i++)
                hMessage.payload.result[i].relevance.getTime().should.be.above(new Date().getTime());
            done();
        });
    })

    it('should return hResult OK with an empty array if no matching msgs found', function(done){
        cmd.actor = emptyChannel;
        hClient.processMsgInternal(cmd, function(hMessage){
            hMessage.payload.should.have.property('status', status.OK);
            hMessage.payload.result.length.should.be.eql(0);
            done();
        });
    })

})