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

describe('hGetThreads', function(){

    var activeChannel = config.getNewCHID(),
        inactiveChannel = config.getNewCHID(),
        hCommandController = new config.cmdController(config.cmdParams),
        status = require('../lib/codes.js').hResultStatus,
        correctStatus = config.db.createPk(),
        cmd = JSON.parse(JSON.stringify(config.genericCmdMsg)),
        convids = [],
        shouldNotAppearConvids = [];

    before(config.beforeFN)

    after(config.afterFN)

    before(function(done){
        this.timeout(5000);
        config.createChannel(activeChannel, [config.validJID], config.validJID, true, done);
    })

    before(function(done){
        this.timeout(5000);
        config.createChannel(inactiveChannel, [config.validJID], config.validJID, false, done);
    })

    //Root messages with different status
    for(var i = 0; i < 2; i++)
        before(function(done){
            config.publishMessageWithResult(config.validJID, activeChannel, 'hConvState', {status: config.db.createPk()}, new Date(), true, function(hMessage) {
                hMessage.payload.should.have.property('status', status.OK);
                shouldNotAppearConvids.push(hMessage.payload.result.convid);
                done();
            });
        })

    //Change state of one of the previous convstate to a good one
    before(function(done){
        var opts = {};
        opts.priority = 3;
        opts.convid = shouldNotAppearConvids.pop();
        config.publishMessageWithResult(config.validJID, activeChannel, 'hConvState', {status: correctStatus}, new Date(), true, opts, function(hMessage) {
            hMessage.payload.should.have.property('status', status.OK);
            convids.push(hMessage.payload.result.convid);
            done();
        });
    })

    //Add a new conversation with good status
    before(function(done){
        var opts = {};
        opts.priority = 3;
        config.publishMessageWithResult(config.validJID, activeChannel, 'hConvState', {status: correctStatus}, new Date(), true, opts, function(hMessage) {
            hMessage.payload.should.have.property('status', status.OK);
            convids.push(hMessage.payload.result.convid);
            done();
        });
    })



    beforeEach(function(){
        cmd = config.makeHMessage(activeChannel, config.validJID, 'hCommand',{});
        cmd.msgid = 'testCmd';
        cmd.payload = {
            cmd : 'hGetThreads',
            params : {
                status: correctStatus
            }
        };
    })

    it('should return hResult error INVALID_ATTR without params', function(done){
        cmd.payload.params = null;
        hCommandController.execCommand(cmd, function(hMessage){
            hMessage.should.have.property('ref', cmd.msgid);
            hMessage.payload.should.have.property('status', status.INVALID_ATTR);
            hMessage.payload.should.have.property('result').and.be.a('string');
            done();
        });
    })

    it('should return hResult error INVALID_ATTR with params not an object', function(done){
        cmd.payload.params = 'string';
        hCommandController.execCommand(cmd, function(hMessage){
            hMessage.should.have.property('ref', cmd.msgid);
            hMessage.payload.should.have.property('status', status.INVALID_ATTR);
            hMessage.payload.should.have.property('result').and.be.a('string');
            done();
        });
    })

    it('should return hResult error NOT_AUTHORIZED if the publisher is not a subscriber', function(done){
        cmd.publisher = 'not_a_subscriber@' + config.validDomain;
        hCommandController.execCommand(cmd, function(hMessage){
            hMessage.should.have.property('ref', cmd.msgid);
            hMessage.payload.should.have.property('status', status.NOT_AUTHORIZED);
            hMessage.payload.should.have.property('result').and.be.a('string');
            done();
        });
    })

    it('should return hResult error NOT_AUTHORIZED if the channel is inactive', function(done){
        cmd.actor = inactiveChannel;
        hCommandController.execCommand(cmd, function(hMessage){
            hMessage.should.have.property('ref', cmd.msgid);
            hMessage.payload.should.have.property('status', status.NOT_AUTHORIZED);
            hMessage.payload.should.have.property('result').and.match(/inactive/);
            done();
        });
    })

    it('should return hResult error MISSING_ATTR if actor is not provided', function(done){
        delete cmd.actor;
        hCommandController.execCommand(cmd, function(hMessage){
            hMessage.should.have.property('ref', cmd.msgid);
            hMessage.payload.should.have.property('status', status.MISSING_ATTR);
            hMessage.payload.should.have.property('result').and.match(/actor/);
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

    it('should return hResult error MISSING_ATTR if status is not provided', function(done){
        delete cmd.payload.params.status;
        hCommandController.execCommand(cmd, function(hMessage){
            hMessage.should.have.property('ref', cmd.msgid);
            hMessage.payload.should.have.property('status', status.MISSING_ATTR);
            hMessage.payload.should.have.property('result').and.match(/status/);
            done();
        });

    })

    it('should return hResult error INVALID_ATTR with status not a string', function(done){
        cmd.payload.params.status= [];
        hCommandController.execCommand(cmd, function(hMessage){
            hMessage.should.have.property('ref', cmd.msgid);
            hMessage.payload.should.have.property('status', status.INVALID_ATTR);
            hMessage.payload.should.have.property('result').and.match(/status/);
            done();
        });
    })

    it('should return hResult error NOT_AVAILABLE if the channel does not exist', function(done){
        cmd.actor = '#this channel does not exist@localhost';
        hCommandController.execCommand(cmd, function(hMessage){
            hMessage.should.have.property('ref', cmd.msgid);
            hMessage.payload.should.have.property('status', status.NOT_AVAILABLE);
            hMessage.payload.should.have.property('result').and.be.a('string');
            done();
        });
    })

    it('should return hResult OK with an empty [] if no messages found matching status', function(done){
        cmd.payload.params.status = config.db.createPk();
        hCommandController.execCommand(cmd, function(hMessage){
            hMessage.should.have.property('ref', cmd.msgid);
            hMessage.payload.should.have.property('status', status.OK);
            hMessage.payload.result.should.be.an.instanceof(Array).and.have.lengthOf(0);
            done();
        });
    })

    it('should return hResult OK with an [] containing convids whose convstate status is equal to the sent one', function(done){
        hCommandController.execCommand(cmd, function(hMessage){
            hMessage.should.have.property('ref', cmd.msgid);
            hMessage.payload.should.have.property('status', status.OK);
            hMessage.payload.result.should.be.an.instanceof(Array).and.have.lengthOf(convids.length);
            done();
        });
    })

    it('should return hResult OK with an [] without convid that was equal to the one sent but is not anymore', function(done){
        hCommandController.execCommand(cmd, function(hMessage){
            hMessage.should.have.property('ref', cmd.msgid);
            hMessage.payload.should.have.property('status', status.OK);
            for(var i = 0; i < shouldNotAppearConvids.length; i++)
                hMessage.payload.result.should.not.include(shouldNotAppearConvids[i]);
            done();
        });
    })

    describe('#FilterMessage()', function(){
        var hClientConst = require('../lib/hClient.js').hClient;
        var hClient = new hClientConst(config.cmdParams);

        before(function(done){
            hClient.once('connect', done);
            hClient.connect(config.logins[0]);
        })

        after(function(done){
            hClient.once('disconnect', done);
            hClient.disconnect();
        })

        before(function(done){
            var filterCmd = config.makeHMessage('hnode@' + hClient.serverDomain, config.logins[0].jid, 'hCommand',{});
            filterCmd.msgid = 'testCmd';
            filterCmd.payload = {
                cmd : 'hSetFilter',
                params : {eq:{priority: 3}}
            };
            hClient.processMsgInternal(filterCmd, function(hMessage){
                hMessage.payload.should.have.property('status', status.OK);
                done();
            });
        })

        it('should only return convids of filtered conversations', function(done){
            hClient.processMsgInternal(cmd, function(hMessage){
                hMessage.should.have.property('ref', cmd.msgid);
                hMessage.payload.should.have.property('status', status.OK);
                hMessage.payload.result.should.be.an.instanceof(Array).and.have.lengthOf(1);
                done();
            });
        })
    })
})