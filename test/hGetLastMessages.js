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

describe('hGetLastMessages', function(){

    var hCommandController = new config.cmdController(config.cmdParams);
    var cmd;
    var status = require('../lib/codes.js').hResultStatus;
    var existingCHID = config.getNewCHID();
    var chanWithHeader = config.getNewCHID();
    var inactiveChan = config.getNewCHID();
    var DateTab = [];

    var maxMsgRetrieval = 6;

    before(config.beforeFN)

    before(function(done){
        this.timeout(5000);
        config.createChannel(existingCHID, [config.validJID, config.logins[0].jid], config.validJID, true, done);
    })

    before(function(done){
        this.timeout(5000);
        config.createChannel(inactiveChan, [config.validJID, config.logins[0].jid], config.validJID, false, done);
    })

    before(function(done){
        this.timeout(10000);
        var createCmd = config.makeHMessage('hnode@localhost', config.validJID, 'hCommand', {});
        createCmd.msgid = 'hCommandTest123',
        createCmd.payload = {
            cmd : 'hCreateUpdateChannel',
            params : {
                type: 'channel',
                actor: chanWithHeader,
                active : true,
                owner : config.validJID,
                subscribers : [config.validJID, config.logins[0].jid],
                headers : {'MAX_MSG_RETRIEVAL': ''+maxMsgRetrieval}
            }
        };

        var nbOfPublish = 0;
        hCommandController.execCommand(createCmd, function(hMessage){
            hMessage.payload.status.should.be.eql(status.OK);
            for(var i = 0; i < 11; i++)
                config.publishMessage(config.validJID, chanWithHeader, undefined, undefined, undefined, true, function() {
                    nbOfPublish += 1;
                    if(nbOfPublish == 10)
                        done();
                });
        });
    })

    after(config.afterFN)

    beforeEach(function(){
        cmd = config.makeHMessage(existingCHID, config.validJID, 'hCommand',{});
        cmd.msgid = 'hCommandTest123';
        cmd.payload = {
            cmd : 'hGetLastMessages',
            params : {
                nbLastMsg: 5
            }
        };
    })

    it('should return hResult ok if there are no hMessages stored', function(done){
        hCommandController.execCommand(cmd, function(hMessage){
            hMessage.should.have.property('ref', cmd.msgid);
            hMessage.payload.should.have.property('status', status.OK);
            hMessage.payload.should.have.property('result').and. be.an.instanceof(Array);
            hMessage.payload.should.have.property('result').and.be.an.instanceof(Array).with.lengthOf(0);
            done();
        });
    })

    describe('Test with messages published',function() {

        for(var i = 0; i < 10; i++) {
            var count = 0;
            var date = new Date(100000 + i * 100000);
            DateTab.push(date);
            before(function(done){
                config.publishMessage(config.validJID, existingCHID, undefined, undefined,DateTab[count], true, done);
                count++;
            })

        }

        it('should return hResult error INVALID_ATTR with actor not a channel', function(done){
            cmd.actor = 'not a channel@localhost';
            hCommandController.execCommand(cmd, function(hMessage){
                hMessage.should.have.property('ref', cmd.msgid);
                hMessage.payload.should.have.property('status', status.INVALID_ATTR);
                hMessage.payload.should.have.property('result').and.match(/actor/);
                done();
            });
        })

        it('should return hResult error MISSING_ATTR if no channel is passed', function(done){
            delete cmd.actor;
            hCommandController.execCommand(cmd, function(hMessage){
                hMessage.should.have.property('ref', cmd.msgid);
                hMessage.payload.should.have.property('status', status.MISSING_ATTR);
                hMessage.payload.should.have.property('result').and.be.a('string');
                done();
            });
        })

        it('should return hResult error NOT_AUTHORIZED if publisher not in subscribers list', function(done){
            cmd.publisher = 'someone@' + config.validDomain;
            hCommandController.execCommand(cmd, function(hMessage){
                hMessage.should.have.property('ref', cmd.msgid);
                hMessage.payload.should.have.property('status', status.NOT_AUTHORIZED);
                hMessage.payload.should.have.property('result').and.be.a('string');
                done();
            });
        })

        it('should return hResult error NOT_AVAILABLE if channel does not exist', function(done){
            cmd.actor = '#this channel does not exist@localhost';
            hCommandController.execCommand(cmd, function(hMessage){
                hMessage.should.have.property('ref', cmd.msgid);
                hMessage.payload.should.have.property('status', status.NOT_AVAILABLE);
                hMessage.payload.should.have.property('result').and.be.a('string');
                done();
            });
        })

        it('should return hResult error NOT_AUTHORIZED if channel inactive', function(done){
            cmd.actor = inactiveChan;
            hCommandController.execCommand(cmd, function(hMessage){
                hMessage.should.have.property('ref', cmd.msgid);
                hMessage.payload.should.have.property('status', status.NOT_AUTHORIZED);
                hMessage.payload.should.have.property('result').and.be.a('string');
                done();
            });
        })

        it('should return hResult ok with 10 msgs if not header in chan and cmd quant not a number', function(done){
            cmd.payload.params.nbLastMsg = 'not a number';
            cmd.actor = existingCHID;
            hCommandController.execCommand(cmd, function(hMessage){
                hMessage.should.have.property('ref', cmd.msgid);
                hMessage.payload.should.have.property('status', status.OK);
                hMessage.payload.should.have.property('result').and.be.an.instanceof(Array).with.lengthOf(10);;
                done();
            });
        })

        it('should return hResult ok with 10 messages if not default in channel or cmd', function(done){
            delete cmd.payload.params.nbLastMsg;
            cmd.actor = existingCHID;
            hCommandController.execCommand(cmd, function(hMessage){
                hMessage.should.have.property('ref', cmd.msgid);
                hMessage.payload.should.have.property('status', status.OK);
                hMessage.payload.should.have.property('result').and.be.an.instanceof(Array).with.lengthOf(10);;
                done();
            });
        })

        it('should return hResult ok with 10 last messages', function(done){
            delete cmd.payload.params.nbLastMsg;
            cmd.actor = existingCHID;
            hCommandController.execCommand(cmd, function(hMessage){

                hMessage.should.have.property('ref', cmd.msgid);
                hMessage.payload.should.have.property('status', status.OK);
                hMessage.payload.should.have.property('result').and.be.an.instanceof(Array).with.lengthOf(10);

                for(i=0; i<10;i++) {
                    var int = DateTab.length - (i + 1);

                    //Should be a string for compare
                    var supposedDate = '' +DateTab[int];
                    var trueDate = '' + hMessage.payload.result[i].published;

                    supposedDate.should.be.eql(trueDate);
                }
                done();
            });
        })

        it('should return hResult ok with default messages of channel if not specified', function(done){
            delete cmd.payload.params.nbLastMsg;
            cmd.actor = chanWithHeader;
            hCommandController.execCommand(cmd, function(hMessage){
                hMessage.should.have.property('ref', cmd.msgid);
                hMessage.payload.should.have.property('status', status.OK);
                hMessage.payload.should.have.property('result').and.be.an.instanceof(Array).with.lengthOf(maxMsgRetrieval);
                done();
            });
        })

        it('should return hResult ok with nb of msgs in cmd if specified with headers', function(done){
            var length = 4;
            cmd.payload.params.nbLastMsg = length;
            hCommandController.execCommand(cmd, function(hMessage){
                hMessage.should.have.property('ref', cmd.msgid);
                hMessage.payload.should.have.property('status', status.OK);
                hMessage.payload.should.have.property('result').and.be.an.instanceof(Array).with.lengthOf(length);
                done();
            });
        })

        it('should return hResult ok with nb of msgs in cmd if specified if header specified', function(done){
            var length = 4;
            cmd.payload.params.nbLastMsg = length;
            cmd.actor = chanWithHeader;
            hCommandController.execCommand(cmd, function(hMessage){
                hMessage.should.have.property('ref', cmd.msgid);
                hMessage.payload.should.have.property('status', status.OK);
                hMessage.payload.should.have.property('result').and.be.an.instanceof(Array).with.lengthOf(length);
                done();
            });
        })

        describe('#FilterMessage()', function(){
            var setMsg;
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

            before(function(){
                for(var i = 0; i < 5; i++) {
                    var count = 0;
                    var date = new Date(100000 + i * 100000);
                    DateTab.push(date);
                    config.publishMessage(config.logins[0].jid, existingCHID, undefined, undefined,DateTab[count], true, {author:'u2@localhost'}, function(){});
                    count++;
                }
            })

            beforeEach(function(){
                setMsg = config.makeHMessage('hnode@' + hClient.serverDomain, config.logins[0].jid, 'hCommand',{});
                setMsg.payload = {
                    cmd : 'hSetFilter',
                    params : {}
                };
            })

            it('should return Ok with default messages of channel if not specified and message respect filter', function(done){
                delete cmd.payload.params.nbLastMsg;
                setMsg.payload.params = {
                    in:{publisher: ['u1@localhost']}
                }
                hClient.processMsgInternal(setMsg, function(){});
                hClient.processMsgInternal(cmd, function(hMessage){
                    hMessage.should.have.property('type', 'hResult');
                    hMessage.payload.should.have.property('status', status.OK);
                    hMessage.payload.should.have.property('result').and.be.an.instanceof(Array).with.lengthOf(10);
                    done();
                });
            })

            it('should return Ok with only filtered messages with right quantity', function(done){
                cmd.payload.params.nbLastMsg = 3;
                setMsg.payload.params = {
                    in:{author: ['u2@localhost']}
                }
                hClient.processMsgInternal(setMsg, function(){});
                hClient.processMsgInternal(cmd, function(hMessage){
                    hMessage.should.have.property('type', 'hResult');
                    hMessage.payload.should.have.property('status', status.OK);
                    hMessage.payload.should.have.property('result').and.be.an.instanceof(Array).with.lengthOf(3);
                    for(var i = 0; i < hMessage.payload.result.length; i++)
                        hMessage.payload.result[i].should.have.property('author', 'u2@localhost');
                    done();
                });
            })

            it('should return Ok with only filtered messages with less quantity if demanded does not exist.', function(done){
                cmd.payload.params.nbLastMsg = 1000;
                setMsg.payload.params = {
                    in:{author: ['u2@localhost']}
                }
                hClient.processMsgInternal(setMsg, function(){});
                hClient.processMsgInternal(cmd, function(hMessage){
                    hMessage.should.have.property('type', 'hResult');
                    hMessage.payload.should.have.property('status', status.OK);
                    hMessage.payload.should.have.property('result').and.be.an.instanceof(Array).with.lengthOf(5);
                    for(var i = 0; i < hMessage.payload.result.length; i++)
                        hMessage.payload.result[i].should.have.property('author', 'u2@localhost');
                    done();
                });
            })
        })
    })
})