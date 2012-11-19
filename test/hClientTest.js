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
var codes = require('../lib/codes.js');
var validators = require('../lib/validators.js');

describe('hClient XMPP Connection', function(){

    var hClientConst = require('../lib/hClient.js').hClient;
    var hClient = new hClientConst(config.cmdParams);

    before(config.beforeFN)

    after(config.afterFN)

    describe('#connect()', function(){
        var xmppOptions;

        beforeEach(function(){
            xmppOptions = JSON.parse(JSON.stringify(config.logins[0]));
        })

        afterEach(function(done){
            hClient.once('disconnect', done);
            hClient.disconnect();
        })

        it('should emit an event when connected', function(done){
            hClient.once('connect', done);
            hClient.connect(xmppOptions);
        })

        it('should emit an hStatus when wrong authentication', function(done){
            xmppOptions.password = 'another password';
            hClient.once('hStatus', function(hStatus){
                should.exist(hStatus);
                hStatus.status.should.be.eql(codes.statuses.DISCONNECTED);
                hStatus.errorCode.should.be.eql(codes.errors.AUTH_FAILED);
                done() });
            hClient.connect(xmppOptions);
        })

        it('should emit an hStatus when invalid jid', function(done){
            xmppOptions.jid = 'not valid';
            hClient.once('hStatus', function(hStatus){
                should.exist(hStatus);
                hStatus.status.should.be.eql(codes.statuses.DISCONNECTED);
                hStatus.errorCode.should.be.eql(codes.errors.JID_MALFORMAT);
                done();
            });
            hClient.connect(xmppOptions);
        })

        /*it('should emit an hStatus when invalid domain', function(done){
            var user = validators.splitJID(xmppOptions.jid)
            xmppOptions.jid = user[0] + '@anotherDomain';
            hClient.once('hStatus', function(hStatus){
                should.exist(hStatus);
                hStatus.status.should.be.eql(codes.statuses.DISCONNECTED);
                hStatus.errorCode.should.be.eql(codes.errors.AUTH_FAILED);
                done();
            });
            hClient.connect(xmppOptions);
        })*/
    })

    describe('#FilterMessage()', function(){
        var cmdMsg, hMsg;
        var activeChan = config.getNewCHID();

        before(function(done){
            hClient.once('connect', done);
            hClient.connect(config.logins[0]);
        })

        after(function(done){
            hClient.once('disconnect', done);
            hClient.disconnect();
        })

        before(function(done){
            this.timeout(5000);
            config.createChannel(activeChan, [config.logins[0].jid], config.logins[0].jid, true, done);
        })

        beforeEach(function(){
            cmdMsg = config.makeHMessage('hnode@' + hClient.serverDomain, config.logins[0].jid, 'hCommand',{});
            cmdMsg.payload = {
                cmd : 'hCreateUpdateChannel',
                params : {
                    type: 'channel',
                    actor : activeChan,
                    active : true,
                    owner : config.logins[0].jid,
                    subscribers : [config.logins[0].jid],
                    filter: {}
                }
            };

            hMsg = config.makeHMessage(activeChan, config.logins[0].jid, undefined, {})
        })

        it('should return Ok if empty filter', function(done){
            hClient.processMsgInternal(cmdMsg, function(){});
            hClient.processMsgInternal(hMsg, function(hMessage){
                hMessage.should.have.property('type', 'hResult');
                hMessage.payload.should.have.property('status', codes.hResultStatus.OK);
                done();
            });
        })

        describe('#eqFilter()', function(){

            it('should return INVALID_ATTR if hMessage don\'t respect "eq" filter', function(done){
                cmdMsg.payload.params.filter = {eq: {priority: 2}};
                hMsg.priority = 3;
                hClient.processMsgInternal(cmdMsg, function(){});
                hClient.processMsgInternal(hMsg, function(hMessage){
                    hMessage.should.have.property('type', 'hResult');
                    hMessage.payload.should.have.property('status', codes.hResultStatus.INVALID_ATTR);
                    done();
                });
            })

            it('should return INVALID_ATTR if a bad attribute of hMessage is use', function(done){
                cmdMsg.payload.params.filter = {eq: {attribut: 'bad'}};
                hClient.processMsgInternal(cmdMsg, function(){});
                hClient.processMsgInternal(hMsg, function(hMessage){
                    hMessage.should.have.property('type', 'hResult');
                    hMessage.payload.should.have.property('status', codes.hResultStatus.INVALID_ATTR);
                    done();
                });
            })

            it('should return INVALID_ATTR if hMessage don\'t respect "eq" filter with multiple hCondition', function(done){
                cmdMsg.payload.params.filter = {eq: {priority: 2 , author: config.logins[0].jid}};
                hMsg.priority = 2;
                hMsg.author = config.logins[1].jid
                hClient.processMsgInternal(cmdMsg, function(){});
                hClient.processMsgInternal(hMsg, function(hMessage){
                    hMessage.should.have.property('type', 'hResult');
                    hMessage.payload.should.have.property('status', codes.hResultStatus.INVALID_ATTR);
                    done();
                });
            })

            it('should return OK if hMessage respect "eq" filter with multiple hCondition', function(done){
                cmdMsg.payload.params.filter = {eq: {priority: 2 , author: config.logins[0].jid}};
                hMsg.priority = 2;
                hMsg.author = config.logins[0].jid;
                hClient.processMsgInternal(cmdMsg, function(){});
                hClient.processMsgInternal(hMsg, function(hMessage){
                    hMessage.should.have.property('type', 'hResult');
                    hMessage.payload.should.have.property('status', codes.hResultStatus.OK);
                    done();
                });
            })

            it('should return OK if hMessage respect "eq" filter ', function(done){
                cmdMsg.payload.params.filter = {eq: {'payload.priority': 2}};
                hMsg.payload.priority = 2;
                hClient.processMsgInternal(cmdMsg, function(){});
                hClient.processMsgInternal(hMsg, function(hMessage){
                    hMessage.should.have.property('type', 'hResult');
                    hMessage.payload.should.have.property('status', codes.hResultStatus.OK);
                    done();
                });
            })
        })

        describe('#neFilter()', function(){

            it('should return INVALID_ATTR if hMessage don\'t respect "ne" filter', function(done){
                cmdMsg.payload.params.filter = {ne: {priority: 2}};
                hMsg.priority = 2;
                hClient.processMsgInternal(cmdMsg, function(){});
                hClient.processMsgInternal(hMsg, function(hMessage){
                    hMessage.should.have.property('type', 'hResult');
                    hMessage.payload.should.have.property('status', codes.hResultStatus.INVALID_ATTR);
                    done();
                });
            })

            it('should return INVALID_ATTR if a bad attribute of hMessage is use', function(done){
                cmdMsg.payload.params.filter = {ne: {attribut: 'bad'}};
                hClient.processMsgInternal(cmdMsg, function(){});
                hClient.processMsgInternal(hMsg, function(hMessage){
                    hMessage.should.have.property('type', 'hResult');
                    hMessage.payload.should.have.property('status', codes.hResultStatus.INVALID_ATTR);
                    done();
                });
            })

            it('should return INVALID_ATTR if hMessage don\'t respect "ne" filter with multiple hCondition', function(done){
                cmdMsg.payload.params.filter = {ne: {priority: 2 , author: config.logins[0].jid}};
                hMsg.priority = 3;
                hMsg.author = config.logins[0].jid
                hClient.processMsgInternal(cmdMsg, function(){});
                hClient.processMsgInternal(hMsg, function(hMessage){
                    hMessage.should.have.property('type', 'hResult');
                    hMessage.payload.should.have.property('status', codes.hResultStatus.INVALID_ATTR);
                    done();
                });
            })

            it('should return OK if hMessage respect "ne" filter with multiple hCondition', function(done){
                cmdMsg.payload.params.filter = {ne: {priority: 2 , author: config.logins[0].jid}};
                hMsg.priority = 3;
                hMsg.author = config.logins[1].jid;
                hClient.processMsgInternal(cmdMsg, function(){});
                hClient.processMsgInternal(hMsg, function(hMessage){
                    hMessage.should.have.property('type', 'hResult');
                    hMessage.payload.should.have.property('status', codes.hResultStatus.OK);
                    done();
                });
            })

            it('should return OK if hMessage respect "ne" filter ', function(done){
                cmdMsg.payload.params.filter = {ne: {'payload.priority': 2}};
                hMsg.payload.priority = 3;
                hClient.processMsgInternal(cmdMsg, function(){});
                hClient.processMsgInternal(hMsg, function(hMessage){
                    hMessage.should.have.property('type', 'hResult');
                    hMessage.payload.should.have.property('status', codes.hResultStatus.OK);
                    done();
                });
            })
        })

        describe('#gtFilter()', function(){

            it('should return INVALID_ATTR if hMessage don\'t respect "gt" filter', function(done){
                cmdMsg.payload.params.filter = {gt: {priority: 2}};
                hMsg.priority = 2;
                hClient.processMsgInternal(cmdMsg, function(){});
                hClient.processMsgInternal(hMsg, function(hMessage){
                    hMessage.should.have.property('type', 'hResult');
                    hMessage.payload.should.have.property('status', codes.hResultStatus.INVALID_ATTR);
                    done();
                });
            })

            it('should return INVALID_ATTR if a bad attribute of hMessage is use', function(done){
                cmdMsg.payload.params.filter = {gt: {attribut: 12}};
                hClient.processMsgInternal(cmdMsg, function(){});
                hClient.processMsgInternal(hMsg, function(hMessage){
                    hMessage.should.have.property('type', 'hResult');
                    hMessage.payload.should.have.property('status', codes.hResultStatus.INVALID_ATTR);
                    done();
                });
            })

            it('should return INVALID_ATTR if an attribute is not a number', function(done){
                cmdMsg.payload.params.filter = {gt: {priority: 'not a number'}};
                hClient.processMsgInternal(cmdMsg, function(){});
                hClient.processMsgInternal(hMsg, function(hMessage){
                    hMessage.should.have.property('type', 'hResult');
                    hMessage.payload.should.have.property('status', codes.hResultStatus.INVALID_ATTR);
                    done();
                });
            })

            it('should return INVALID_ATTR if hMessage don\'t respect "gt" filter with multiple hCondition', function(done){
                cmdMsg.payload.params.filter = {gt: {priority: 2 , timeout: 10000}};
                hMsg.priority = 3;
                hMsg.timeout = 9999
                hClient.processMsgInternal(cmdMsg, function(){});
                hClient.processMsgInternal(hMsg, function(hMessage){
                    hMessage.should.have.property('type', 'hResult');
                    hMessage.payload.should.have.property('status', codes.hResultStatus.INVALID_ATTR);
                    done();
                });
            })

            it('should return OK if hMessage respect "gt" filter with multiple hCondition', function(done){
                cmdMsg.payload.params.filter = {gt: {priority: 2 , timeout: 10000}};
                hMsg.priority = 3;
                hClient.processMsgInternal(cmdMsg, function(){});
                hClient.processMsgInternal(hMsg, function(hMessage){
                    hMessage.should.have.property('type', 'hResult');
                    hMessage.payload.should.have.property('status', codes.hResultStatus.OK);
                    done();
                });
            })

            it('should return OK if hMessage respect "gt" filter ', function(done){
                cmdMsg.payload.params.filter = {gt: {'payload.priority': 2}};
                hMsg.payload.priority = 3;
                hClient.processMsgInternal(cmdMsg, function(){});
                hClient.processMsgInternal(hMsg, function(hMessage){
                    hMessage.should.have.property('type', 'hResult');
                    hMessage.payload.should.have.property('status', codes.hResultStatus.OK);
                    done();
                });
            })
        })

        describe('#gteFilter()', function(){

            it('should return INVALID_ATTR if hMessage don\'t respect "gte" filter', function(done){
                cmdMsg.payload.params.filter = {gte: {priority: 2}};
                hMsg.priority = 1;
                hClient.processMsgInternal(cmdMsg, function(){});
                hClient.processMsgInternal(hMsg, function(hMessage){
                    hMessage.should.have.property('type', 'hResult');
                    hMessage.payload.should.have.property('status', codes.hResultStatus.INVALID_ATTR);
                    done();
                });
            })

            it('should return INVALID_ATTR if a bad attribute of hMessage is use', function(done){
                cmdMsg.payload.params.filter = {gte: {attribut: 12}};
                hClient.processMsgInternal(cmdMsg, function(){});
                hClient.processMsgInternal(hMsg, function(hMessage){
                    hMessage.should.have.property('type', 'hResult');
                    hMessage.payload.should.have.property('status', codes.hResultStatus.INVALID_ATTR);
                    done();
                });
            })

            it('should return INVALID_ATTR if an attribute is not a number', function(done){
                cmdMsg.payload.params.filter = {gte: {priority: 'not a number'}};
                hClient.processMsgInternal(cmdMsg, function(){});
                hClient.processMsgInternal(hMsg, function(hMessage){
                    hMessage.should.have.property('type', 'hResult');
                    hMessage.payload.should.have.property('status', codes.hResultStatus.INVALID_ATTR);
                    done();
                });
            })

            it('should return INVALID_ATTR if hMessage don\'t respect "gte" filter with multiple hCondition', function(done){
                cmdMsg.payload.params.filter = {gte: {priority: 2 , timeout: 10000}};
                hMsg.priority = 2;
                hMsg.timeout = 9999
                hClient.processMsgInternal(cmdMsg, function(){});
                hClient.processMsgInternal(hMsg, function(hMessage){
                    hMessage.should.have.property('type', 'hResult');
                    hMessage.payload.should.have.property('status', codes.hResultStatus.INVALID_ATTR);
                    done();
                });
            })

            it('should return OK if hMessage respect "gte" filter with multiple hCondition', function(done){
                cmdMsg.payload.params.filter = {gte: {priority: 2 , timeout: 10000}};
                hMsg.priority = 2;
                hClient.processMsgInternal(cmdMsg, function(){});
                hClient.processMsgInternal(hMsg, function(hMessage){
                    hMessage.should.have.property('type', 'hResult');
                    hMessage.payload.should.have.property('status', codes.hResultStatus.OK);
                    done();
                });
            })

            it('should return OK if hMessage respect "gte" filter ', function(done){
                cmdMsg.payload.params.filter = {gte: {'payload.params.priority': 2}};
                hMsg.payload.params = {};
                hMsg.payload.params.priority = 2;
                hClient.processMsgInternal(cmdMsg, function(){});
                hClient.processMsgInternal(hMsg, function(hMessage){
                    hMessage.should.have.property('type', 'hResult');
                    hMessage.payload.should.have.property('status', codes.hResultStatus.OK);
                    done();
                });
            })
        })

        describe('#ltFilter()', function(){

            it('should return INVALID_ATTR if hMessage don\'t respect "lt" filter', function(done){
                cmdMsg.payload.params.filter = {lt: {priority: 2}};
                hMsg.priority = 3;
                hClient.processMsgInternal(cmdMsg, function(){});
                hClient.processMsgInternal(hMsg, function(hMessage){
                    hMessage.should.have.property('type', 'hResult');
                    hMessage.payload.should.have.property('status', codes.hResultStatus.INVALID_ATTR);
                    done();
                });
            })

            it('should return INVALID_ATTR if a bad attribute of hMessage is use', function(done){
                cmdMsg.payload.params.filter = {lt: {attribut: 12}};
                hClient.processMsgInternal(cmdMsg, function(){});
                hClient.processMsgInternal(hMsg, function(hMessage){
                    hMessage.should.have.property('type', 'hResult');
                    hMessage.payload.should.have.property('status', codes.hResultStatus.INVALID_ATTR);
                    done();
                });
            })

            it('should return INVALID_ATTR if an attribute is not a number', function(done){
                cmdMsg.payload.params.filter = {lt: {priority: 'not a number'}};
                hClient.processMsgInternal(cmdMsg, function(){});
                hClient.processMsgInternal(hMsg, function(hMessage){
                    hMessage.should.have.property('type', 'hResult');
                    hMessage.payload.should.have.property('status', codes.hResultStatus.INVALID_ATTR);
                    done();
                });
            })

            it('should return INVALID_ATTR if hMessage don\'t respect "lt" filter with multiple hCondition', function(done){
                cmdMsg.payload.params.filter = {lt: {priority: 2 , timeout: 10000}};
                hMsg.priority = 2;
                hMsg.timeout = 10001;
                hClient.processMsgInternal(cmdMsg, function(){});
                hClient.processMsgInternal(hMsg, function(hMessage){
                    hMessage.should.have.property('type', 'hResult');
                    hMessage.payload.should.have.property('status', codes.hResultStatus.INVALID_ATTR);
                    done();
                });
            })

            it('should return OK if hMessage respect "lt" filter with multiple hCondition', function(done){
                cmdMsg.payload.params.filter = {lt: {priority: 2 , timeout: 10000}};
                hMsg.priority = 1;
                hMsg.timeout = 9999;
                hClient.processMsgInternal(cmdMsg, function(){});
                hClient.processMsgInternal(hMsg, function(hMessage){
                    hMessage.should.have.property('type', 'hResult');
                    hMessage.payload.should.have.property('status', codes.hResultStatus.OK);
                    done();
                });
            })

            it('should return OK if hMessage respect "lt" filter ', function(done){
                cmdMsg.payload.params.filter = {lt: {'payload.params.priority': 2}};
                hMsg.payload.params = {};
                hMsg.payload.params.priority = 1;
                hClient.processMsgInternal(cmdMsg, function(){});
                hClient.processMsgInternal(hMsg, function(hMessage){
                    hMessage.should.have.property('type', 'hResult');
                    hMessage.payload.should.have.property('status', codes.hResultStatus.OK);
                    done();
                });
            })
        })

        describe('#lteFilter()', function(){

            it('should return INVALID_ATTR if hMessage don\'t respect "lte" filter', function(done){
                cmdMsg.payload.params.filter = {lte: {priority: 2}};
                hMsg.priority = 3;
                hClient.processMsgInternal(cmdMsg, function(){});
                hClient.processMsgInternal(hMsg, function(hMessage){
                    hMessage.should.have.property('type', 'hResult');
                    hMessage.payload.should.have.property('status', codes.hResultStatus.INVALID_ATTR);
                    done();
                });
            })

            it('should return INVALID_ATTR if a bad attribute of hMessage is use', function(done){
                cmdMsg.payload.params.filter = {lte: {attribut: 12}};
                hClient.processMsgInternal(cmdMsg, function(){});
                hClient.processMsgInternal(hMsg, function(hMessage){
                    hMessage.should.have.property('type', 'hResult');
                    hMessage.payload.should.have.property('status', codes.hResultStatus.INVALID_ATTR);
                    done();
                });
            })

            it('should return INVALID_ATTR if an attribute is not a number', function(done){
                cmdMsg.payload.params.filter = {lte: {priority: 'not a number'}};
                hClient.processMsgInternal(cmdMsg, function(){});
                hClient.processMsgInternal(hMsg, function(hMessage){
                    hMessage.should.have.property('type', 'hResult');
                    hMessage.payload.should.have.property('status', codes.hResultStatus.INVALID_ATTR);
                    done();
                });
            })

            it('should return INVALID_ATTR if hMessage don\'t respect "lte" filter with multiple hCondition', function(done){
                cmdMsg.payload.params.filter = {lte: {priority: 2 , timeout: 10000}};
                hMsg.priority = 1;
                hMsg.timeout = 10001;
                hClient.processMsgInternal(cmdMsg, function(){});
                hClient.processMsgInternal(hMsg, function(hMessage){
                    hMessage.should.have.property('type', 'hResult');
                    hMessage.payload.should.have.property('status', codes.hResultStatus.INVALID_ATTR);
                    done();
                });
            })

            it('should return OK if hMessage respect "lte" filter with multiple hCondition', function(done){
                cmdMsg.payload.params.filter = {lte: {priority: 2 , timeout: 10000}};
                hMsg.priority = 1;
                hMsg.timeout = 10000;
                hClient.processMsgInternal(cmdMsg, function(){});
                hClient.processMsgInternal(hMsg, function(hMessage){
                    hMessage.should.have.property('type', 'hResult');
                    hMessage.payload.should.have.property('status', codes.hResultStatus.OK);
                    done();
                });
            })

            it('should return OK if hMessage respect "lte" filter ', function(done){
                cmdMsg.payload.params.filter = {lte: {'payload.params.priority': 2}};
                hMsg.payload.params = {};
                hMsg.payload.params.priority = 2;
                hClient.processMsgInternal(cmdMsg, function(){});
                hClient.processMsgInternal(hMsg, function(hMessage){
                    hMessage.should.have.property('type', 'hResult');
                    hMessage.payload.should.have.property('status', codes.hResultStatus.OK);
                    done();
                });
            })
        })

        describe('#inFilter()', function(){

            it('should return INVALID_ATTR if hMessage don\'t respect "in" filter', function(done){
                cmdMsg.payload.params.filter = {in: {publisher:['u2@localhost', 'u3@localhost']}};
                hClient.processMsgInternal(cmdMsg, function(){});
                hClient.processMsgInternal(hMsg, function(hMessage){
                    hMessage.should.have.property('type', 'hResult');
                    hMessage.payload.should.have.property('status', codes.hResultStatus.INVALID_ATTR);
                    done();
                });
            })

            it('should return INVALID_ATTR if a bad attribute of hMessage is use', function(done){
                cmdMsg.payload.params.filter = {in: {attribut: 'bad'}};
                hClient.processMsgInternal(cmdMsg, function(){});
                hClient.processMsgInternal(hMsg, function(hMessage){
                    hMessage.should.have.property('type', 'hResult');
                    hMessage.payload.should.have.property('status', codes.hResultStatus.INVALID_ATTR);
                    done();
                });
            })

            it('should return INVALID_ATTR if the attribute is not a array', function(done){
                cmdMsg.payload.params.filter = {in: {publisher: 'u1@localhost'}};
                hClient.processMsgInternal(cmdMsg, function(){});
                hClient.processMsgInternal(hMsg, function(hMessage){
                    hMessage.should.have.property('type', 'hResult');
                    hMessage.payload.should.have.property('status', codes.hResultStatus.INVALID_ATTR);
                    done();
                });
            })

            it('should return INVALID_ATTR if hMessage don\'t respect "in" filter with multiple hCondition', function(done){
                cmdMsg.payload.params.filter = {in: {publisher:['u1@localhost'], author:['u2@localhost']}};
                hMsg.author = 'u1@localhost';
                hClient.processMsgInternal(cmdMsg, function(){});
                hClient.processMsgInternal(hMsg, function(hMessage){
                    hMessage.should.have.property('type', 'hResult');
                    hMessage.payload.should.have.property('status', codes.hResultStatus.INVALID_ATTR);
                    done();
                });
            })

            it('should return OK if hMessage respect "in" filter with multiple hCondition', function(done){
                cmdMsg.payload.params.filter = {in: {publisher:['u1@localhost'] , author:['u2@localhost']}};
                hMsg.author = 'u2@localhost';
                hClient.processMsgInternal(cmdMsg, function(){});
                hClient.processMsgInternal(hMsg, function(hMessage){
                    hMessage.should.have.property('type', 'hResult');
                    hMessage.payload.should.have.property('status', codes.hResultStatus.OK);
                    done();
                });
            })

            it('should return OK if hMessage respect "in" filter ', function(done){
                cmdMsg.payload.params.filter = {in: {'payload.params.priority': [2,3]}};
                hMsg.payload.params = {};
                hMsg.payload.params.priority = 2;
                hClient.processMsgInternal(cmdMsg, function(){});
                hClient.processMsgInternal(hMsg, function(hMessage){
                    hMessage.should.have.property('type', 'hResult');
                    hMessage.payload.should.have.property('status', codes.hResultStatus.OK);
                    done();
                });
            })
        })

        describe('#ninFilter()', function(){

            it('should return INVALID_ATTR if hMessage don\'t respect "nin" filter', function(done){
                cmdMsg.payload.params.filter = {nin: {publisher:['u2@localhost', 'u1@localhost']}};
                hClient.processMsgInternal(cmdMsg, function(){});
                hClient.processMsgInternal(hMsg, function(hMessage){
                    hMessage.should.have.property('type', 'hResult');
                    hMessage.payload.should.have.property('status', codes.hResultStatus.INVALID_ATTR);
                    done();
                });
            })

            it('should return INVALID_ATTR if a bad attribute of hMessage is use', function(done){
                cmdMsg.payload.params.filter = {nin: {attribut: ['u2@localhost', 'u1@localhost']}};
                hClient.processMsgInternal(cmdMsg, function(){});
                hClient.processMsgInternal(hMsg, function(hMessage){
                    hMessage.should.have.property('type', 'hResult');
                    hMessage.payload.should.have.property('status', codes.hResultStatus.INVALID_ATTR);
                    done();
                });
            })

            it('should return INVALID_ATTR if the attribute is not a array', function(done){
                cmdMsg.payload.params.filter = {nin: {publisher: 'u2@localhost'}};
                hClient.processMsgInternal(cmdMsg, function(){});
                hClient.processMsgInternal(hMsg, function(hMessage){
                    hMessage.should.have.property('type', 'hResult');
                    hMessage.payload.should.have.property('status', codes.hResultStatus.INVALID_ATTR);
                    done();
                });
            })

            it('should return INVALID_ATTR if hMessage don\'t respect "nin" filter with multiple hCondition', function(done){
                cmdMsg.payload.params.filter = {nin: {publisher:['u2@localhost'], author:['u1@localhost']}};
                hMsg.author = 'u1@localhost';
                hClient.processMsgInternal(cmdMsg, function(){});
                hClient.processMsgInternal(hMsg, function(hMessage){
                    hMessage.should.have.property('type', 'hResult');
                    hMessage.payload.should.have.property('status', codes.hResultStatus.INVALID_ATTR);
                    done();
                });
            })

            it('should return OK if hMessage respect "nin" filter with multiple hCondition', function(done){
                cmdMsg.payload.params.filter = {nin: {publisher:['u2@localhost'] , author:['u1@localhost']}};
                hMsg.author = 'u2@localhost';
                hClient.processMsgInternal(cmdMsg, function(){});
                hClient.processMsgInternal(hMsg, function(hMessage){
                    hMessage.should.have.property('type', 'hResult');
                    hMessage.payload.should.have.property('status', codes.hResultStatus.OK);
                    done();
                });
            })

            it('should return OK if hMessage respect "nin" filter ', function(done){
                cmdMsg.payload.params.filter = {nin: {'payload.params.priority': [2,3]}};
                hMsg.payload.params = {};
                hMsg.payload.params.priority = 4;
                hClient.processMsgInternal(cmdMsg, function(){});
                hClient.processMsgInternal(hMsg, function(hMessage){
                    hMessage.should.have.property('type', 'hResult');
                    hMessage.payload.should.have.property('status', codes.hResultStatus.OK);
                    done();
                });
            })
        })

        describe('#andFilter()', function(){

            it('should return INVALID_ATTR if hMessage don\'t respect "and" filter', function(done){
                cmdMsg.payload.params.filter = {
                    and: [
                        {in:{publisher:['u2@localhost', 'u1@localhost']}},
                        {nin:{author:['u2@localhost', 'u1@localhost']}}
                ]};
                hMsg.author = 'u1@localhost';
                hClient.processMsgInternal(cmdMsg, function(){});
                hClient.processMsgInternal(hMsg, function(hMessage){
                    hMessage.should.have.property('type', 'hResult');
                    hMessage.payload.should.have.property('status', codes.hResultStatus.INVALID_ATTR);
                    done();
                });
            })

            it('should return INVALID_ATTR if a bad attribute of hMessage is use', function(done){
                cmdMsg.payload.params.filter = {
                    and: [
                        {in:{publisher:['u2@localhost', 'u1@localhost']}},
                        {nin:{attribut:['u2@localhost', 'u1@localhost']}}
                    ]};
                hClient.processMsgInternal(cmdMsg, function(){});
                hClient.processMsgInternal(hMsg, function(hMessage){
                    hMessage.should.have.property('type', 'hResult');
                    hMessage.payload.should.have.property('status', codes.hResultStatus.INVALID_ATTR);
                    done();
                });
            })

            it('should return INVALID_ATTR if the "and" attribute is not a array', function(done){
                cmdMsg.payload.params.filter = {
                    and: {
                        in:{publisher:['u2@localhost', 'u1@localhost']},
                        nin:{attribut:['u2@localhost', 'u1@localhost']}
                    }};
                hClient.processMsgInternal(cmdMsg, function(hMessage){
                    hMessage.should.have.property('type', 'hResult');
                    hMessage.payload.should.have.property('status', codes.hResultStatus.INVALID_ATTR);
                    done();
                });
            })

            it('should return OK if hMessage respect "and" filter with multiple hCondition', function(done){
                cmdMsg.payload.params.filter = {
                    and: [
                        {in:{publisher:['u2@localhost', 'u1@localhost']}},
                        {nin:{author:['u2@localhost', 'u1@localhost']}}
                    ]};
                hMsg.author = 'u3@localhost';
                hClient.processMsgInternal(cmdMsg, function(){});
                hClient.processMsgInternal(hMsg, function(hMessage){
                    hMessage.should.have.property('type', 'hResult');
                    hMessage.payload.should.have.property('status', codes.hResultStatus.OK);
                    done();
                });
            })

            it('should return OK if hMessage respect "and" filter ', function(done){
                cmdMsg.payload.params.filter = {
                    and: [
                        {eq:{"payload.params.priority": 2}},
                        {nin:{author:['u2@localhost', 'u1@localhost']}}
                    ]};
                hMsg.author = 'u3@localhost';
                hMsg.payload.params = {};
                hMsg.payload.params.priority = 2;
                hClient.processMsgInternal(cmdMsg, function(){});
                hClient.processMsgInternal(hMsg, function(hMessage){
                    hMessage.should.have.property('type', 'hResult');
                    hMessage.payload.should.have.property('status', codes.hResultStatus.OK);
                    done();
                });
            })
        })

        describe('#orFilter()', function(){

            it('should return INVALID_ATTR if hMessage don\'t respect "or" filter', function(done){
                cmdMsg.payload.params.filter = {
                    or: [
                        {in:{publisher:['u2@localhost', 'u3@localhost']}},
                        {nin:{author:['u2@localhost', 'u1@localhost']}}
                    ]};
                hMsg.author = 'u1@localhost';
                hClient.processMsgInternal(cmdMsg, function(){});
                hClient.processMsgInternal(hMsg, function(hMessage){
                    hMessage.should.have.property('type', 'hResult');
                    hMessage.payload.should.have.property('status', codes.hResultStatus.INVALID_ATTR);
                    done();
                });
            })

            it('should return INVALID_ATTR if a bad attribute of hMessage is use', function(done){
                cmdMsg.payload.params.filter = {
                    or: [
                        {in:{publisher:['u2@localhost', 'u3@localhost']}},
                        {nin:{attribut:['u2@localhost', 'u1@localhost']}}
                    ]};
                hClient.processMsgInternal(cmdMsg, function(){});
                hClient.processMsgInternal(hMsg, function(hMessage){
                    hMessage.should.have.property('type', 'hResult');
                    hMessage.payload.should.have.property('status', codes.hResultStatus.INVALID_ATTR);
                    done();
                });
            })

            it('should return INVALID_ATTR if the "or" attribute is not a array', function(done){
                cmdMsg.payload.params.filter = {
                    or: {
                        in:{publisher:['u2@localhost', 'u1@localhost']},
                        nin:{attribut:['u2@localhost', 'u1@localhost']}
                    }};
                hClient.processMsgInternal(cmdMsg, function(hMessage){
                    hMessage.should.have.property('type', 'hResult');
                    hMessage.payload.should.have.property('status', codes.hResultStatus.INVALID_ATTR);
                    done();
                });
            })

            it('should return OK if hMessage respect "or" filter with multiple hCondition', function(done){
                cmdMsg.payload.params.filter = {
                    or: [
                        {in:{publisher:['u2@localhost', 'u1@localhost']}},
                        {nin:{author:['u2@localhost', 'u1@localhost']}}
                    ]};
                hMsg.author = 'u1@localhost';
                hClient.processMsgInternal(cmdMsg, function(){});
                hClient.processMsgInternal(hMsg, function(hMessage){
                    hMessage.should.have.property('type', 'hResult');
                    hMessage.payload.should.have.property('status', codes.hResultStatus.OK);
                    done();
                });
            })

            it('should return OK if hMessage respect "or" filter ', function(done){
                cmdMsg.payload.params.filter = {
                    or: [
                        {eq:{"payload.params.priority": 2}},
                        {nin:{author:['u2@localhost', 'u1@localhost']}}
                    ]};
                hMsg.author = 'u3@localhost';
                hMsg.payload.params = {};
                hMsg.payload.params.priority = 3;
                hClient.processMsgInternal(cmdMsg, function(){});
                hClient.processMsgInternal(hMsg, function(hMessage){
                    hMessage.should.have.property('type', 'hResult');
                    hMessage.payload.should.have.property('status', codes.hResultStatus.OK);
                    done();
                });
            })
        })

        describe('#norFilter()', function(){

            it('should return INVALID_ATTR if hMessage don\'t respect "nor" filter', function(done){
                cmdMsg.payload.params.filter = {
                    nor: [
                        {in:{publisher:['u2@localhost', 'u3@localhost']}},
                        {nin:{author:['u2@localhost', 'u1@localhost']}}
                    ]};
                hMsg.author = 'u3@localhost';
                hClient.processMsgInternal(cmdMsg, function(){});
                hClient.processMsgInternal(hMsg, function(hMessage){
                    hMessage.should.have.property('type', 'hResult');
                    hMessage.payload.should.have.property('status', codes.hResultStatus.INVALID_ATTR);
                    done();
                });
            })

            it('should return INVALID_ATTR if the "nor" attribute is not a array', function(done){
                cmdMsg.payload.params.filter = {
                    nor: {
                        in:{publisher:['u2@localhost', 'u3@localhost']},
                        nin:{attribut:['u2@localhost', 'u1@localhost']}
                    }};
                hClient.processMsgInternal(cmdMsg, function(hMessage){
                    hMessage.should.have.property('type', 'hResult');
                    hMessage.payload.should.have.property('status', codes.hResultStatus.INVALID_ATTR);
                    done();
                });
            })

            it('should return OK if hMessage respect "nor" filter with multiple hCondition', function(done){
                cmdMsg.payload.params.filter = {
                    nor: [
                        {in:{publisher:['u2@localhost', 'u3@localhost']}},
                        {nin:{author:['u2@localhost', 'u1@localhost']}}
                    ]};
                hMsg.author = 'u1@localhost';
                hClient.processMsgInternal(cmdMsg, function(){});
                hClient.processMsgInternal(hMsg, function(hMessage){
                    hMessage.should.have.property('type', 'hResult');
                    hMessage.payload.should.have.property('status', codes.hResultStatus.OK);
                    done();
                });
            })

            it('should return OK if hMessage respect "nor" filter ', function(done){
                cmdMsg.payload.params.filter = {
                    nor: [
                        {eq:{"payload.params.priority": 2}},
                        {nin:{author:['u2@localhost', 'u1@localhost']}}
                    ]};
                hMsg.author = 'u2@localhost';
                hMsg.payload.params = {};
                hMsg.payload.params.priority = 3;
                hClient.processMsgInternal(cmdMsg, function(){});
                hClient.processMsgInternal(hMsg, function(hMessage){
                    hMessage.should.have.property('type', 'hResult');
                    hMessage.payload.should.have.property('status', codes.hResultStatus.OK);
                    done();
                });
            })
        })

        describe('#notFilter()', function(){

            it('should return INVALID_ATTR if hMessage don\'t respect "not" filter', function(done){
                cmdMsg.payload.params.filter = {
                    not: {
                        in:{publisher:['u2@localhost', 'u1@localhost']}
                    }};
                hClient.processMsgInternal(cmdMsg, function(){});
                hClient.processMsgInternal(hMsg, function(hMessage){
                    hMessage.should.have.property('type', 'hResult');
                    hMessage.payload.should.have.property('status', codes.hResultStatus.INVALID_ATTR);
                    done();
                });
            })

            it('should return INVALID_ATTR if hMessage don\'t respect "not" filter with multiple hCondition', function(done){
                cmdMsg.payload.params.filter = {
                    not: {
                        in:{publisher:['u2@localhost', 'u1@localhost']},
                        eq:{priority:2}
                    }};
                hMsg.priority = 2;
                hClient.processMsgInternal(cmdMsg, function(){});
                hClient.processMsgInternal(hMsg, function(hMessage){
                    hMessage.should.have.property('type', 'hResult');
                    hMessage.payload.should.have.property('status', codes.hResultStatus.INVALID_ATTR);
                    done();
                });
            })

            it('should return OK if hMessage respect "not" filter with multiple hCondition', function(done){
                cmdMsg.payload.params.filter = {
                    not: {
                        in:{publisher:['u2@localhost', 'u3@localhost']},
                        nin:{author:['u2@localhost', 'u1@localhost']}
                    }};
                hMsg.author = 'u2@localhost';
                hClient.processMsgInternal(cmdMsg, function(){});
                hClient.processMsgInternal(hMsg, function(hMessage){
                    hMessage.should.have.property('type', 'hResult');
                    hMessage.payload.should.have.property('status', codes.hResultStatus.OK);
                    done();
                });
            })

            it('should return OK if hMessage respect "not" filter ', function(done){
                cmdMsg.payload.params.filter = {
                    not: {
                        eq:{"payload.params.priority": 2},
                        in:{author:['u2@localhost', 'u1@localhost']}
                    }};
                hMsg.author = 'u3@localhost';
                hMsg.payload.params = {};
                hMsg.payload.params.priority = 3;
                hClient.processMsgInternal(cmdMsg, function(){});
                hClient.processMsgInternal(hMsg, function(hMessage){
                    hMessage.should.have.property('type', 'hResult');
                    hMessage.payload.should.have.property('status', codes.hResultStatus.OK);
                    done();
                });
            })
        })

        describe('#relevantFilter()', function(){

            it('should return INVALID_ATTR if hMessage don\'t respect true "relevant" filter', function(done){
                cmdMsg.payload.params.filter = {relevant: true};
                hMsg.relevance = new Date(79,5,24,11,33,0);
                hClient.processMsgInternal(cmdMsg, function(){});
                hClient.processMsgInternal(hMsg, function(hMessage){
                    hMessage.should.have.property('type', 'hResult');
                    hMessage.payload.should.have.property('status', codes.hResultStatus.INVALID_ATTR);
                    done();
                });
            })

            it('should return INVALID_ATTR if hMessage don\'t respect false "relevant" filter', function(done){
                cmdMsg.payload.params.filter = {relevant: false};
                hMsg.relevance = new Date(2024,5,24,11,33,0);
                hClient.processMsgInternal(cmdMsg, function(){});
                hClient.processMsgInternal(hMsg, function(hMessage){
                    hMessage.should.have.property('type', 'hResult');
                    hMessage.payload.should.have.property('status', codes.hResultStatus.INVALID_ATTR);
                    done();
                });
            })

            it('should return INVALID_ATTR if attribute relevance of hMessage is not set', function(done){
                cmdMsg.payload.params.filter = {relevant: false};
                hClient.processMsgInternal(cmdMsg, function(){});
                hClient.processMsgInternal(hMsg, function(hMessage){
                    hMessage.should.have.property('type', 'hResult');
                    hMessage.payload.should.have.property('status', codes.hResultStatus.INVALID_ATTR);
                    done();
                });
            })

            it('should return INVALID_ATTR if attribute relevance of hMessage is incorrect', function(done){
                cmdMsg.payload.params.filter = {relevant: false};
                hMsg.relevance = 'wrong date';
                hClient.processMsgInternal(cmdMsg, function(){});
                hClient.processMsgInternal(hMsg, function(hMessage){
                    hMessage.should.have.property('type', 'hResult');
                    hMessage.payload.should.have.property('status', codes.hResultStatus.INVALID_ATTR);
                    done();
                });
            })

            it('should return OK if hMessage respect "relevance" filter ', function(done){
                cmdMsg.payload.params.filter = {relevant: true};
                hMsg.relevance = new Date(2024,5,24,11,33,0);
                hClient.processMsgInternal(cmdMsg, function(){});
                hClient.processMsgInternal(hMsg, function(hMessage){
                    hMessage.should.have.property('type', 'hResult');
                    hMessage.payload.should.have.property('status', codes.hResultStatus.OK);
                    done();
                });
            })

            it('should return OK if hMessage respect false "relevance" filter ', function(done){
                cmdMsg.payload.params.filter = {relevant: false};
                hMsg.relevance = new Date(75,5,24,11,33,0);
                hClient.processMsgInternal(cmdMsg, function(){});
                hClient.processMsgInternal(hMsg, function(hMessage){
                    hMessage.should.have.property('type', 'hResult');
                    hMessage.payload.should.have.property('status', codes.hResultStatus.OK);
                    done();
                });
            })
        })

        describe('#geoFilter()', function(){

            it('should return INVALID_ATTR if hMessage don\'t respect "geo" filter', function(done){
                cmdMsg.payload.params.filter = {
                    geo: {
                        lat: 12,
                        lng: 24,
                        radius: 10000
                    }};
                hMsg.location = {};
                hMsg.location.pos = {lat: 24, lng:12};
                hClient.processMsgInternal(cmdMsg, function(){});
                hClient.processMsgInternal(hMsg, function(hMessage){
                    hMessage.should.have.property('type', 'hResult');
                    hMessage.payload.should.have.property('status', codes.hResultStatus.INVALID_ATTR);
                    done();
                });
            })

            it('should return INVALID_ATTR if attribut radius is missing in filter', function(done){
                cmdMsg.payload.params.filter = {
                    geo: {
                        lat: 12,
                        lng: 24
                    }};
                hMsg.location = {};
                hMsg.location.pos = {lat: 24, lng:12};
                hClient.processMsgInternal(cmdMsg, function(){});
                hClient.processMsgInternal(hMsg, function(hMessage){
                    hMessage.should.have.property('type', 'hResult');
                    hMessage.payload.should.have.property('status', codes.hResultStatus.INVALID_ATTR);
                    done();
                });
            })

            it('should return INVALID_ATTR if attribut lat/lng is not a number', function(done){
                cmdMsg.payload.params.filter = {
                    geo: {
                        lat: 24,
                        lng: 'NaN',
                        radius: 10000
                    }};
                hMsg.location = {};
                hMsg.location.pos = {lat: 24, lng:12};
                hClient.processMsgInternal(cmdMsg, function(){});
                hClient.processMsgInternal(hMsg, function(hMessage){
                    hMessage.should.have.property('type', 'hResult');
                    hMessage.payload.should.have.property('status', codes.hResultStatus.INVALID_ATTR);
                    done();
                });
            })

            it('should return INVALID_ATTR if attribut lat/lng of hMessage is not a number', function(done){
                cmdMsg.payload.params.filter = {
                    geo: {
                        lat: 24,
                        lng: 12,
                        radius: 10000
                    }};
                hMsg.location = {};
                hMsg.location.pos = {lat: 12, lng: 'NaN'};
                hClient.processMsgInternal(cmdMsg, function(){});
                hClient.processMsgInternal(hMsg, function(hMessage){
                    hMessage.should.have.property('type', 'hResult');
                    hMessage.payload.should.have.property('status', codes.hResultStatus.INVALID_ATTR);
                    done();
                });
            })

            it('should return OK if hMessage respect "geo" filter', function(done){
                cmdMsg.payload.params.filter = {
                    geo: {
                        lat: 24,
                        lng: 12,
                        radius: 10000
                    }};
                hMsg.location = {};
                hMsg.location.pos = {lat: 23, lng: 12};
                hClient.processMsgInternal(cmdMsg, function(){});
                hClient.processMsgInternal(hMsg, function(hMessage){
                    hMessage.should.have.property('type', 'hResult');
                    hMessage.payload.should.have.property('status', codes.hResultStatus.INVALID_ATTR);
                    done();
                });
            })
        })

        describe('#booleanFilter()', function(){

            it('should return INVALID_ATTR if filter boolean = false', function(done){
                cmdMsg.payload.params.filter = {boolean: false};
                hClient.processMsgInternal(cmdMsg, function(){});
                hClient.processMsgInternal(hMsg, function(hMessage){
                    hMessage.should.have.property('type', 'hResult');
                    hMessage.payload.should.have.property('status', codes.hResultStatus.INVALID_ATTR);
                    done();
                });
            })

            it('should return OK if filter boolean = true', function(done){
                cmdMsg.payload.params.filter = {boolean: true};
                hClient.processMsgInternal(cmdMsg, function(){});
                hClient.processMsgInternal(hMsg, function(hMessage){
                    hMessage.should.have.property('type', 'hResult');
                    hMessage.payload.should.have.property('status', codes.hResultStatus.OK);
                    done();
                });
            })

            it('should return INVALID_ATTR if attribute boolean is not a boolean', function(done){
                cmdMsg.payload.params.filter = {boolean: 'string'};
                hClient.processMsgInternal(cmdMsg, function(hMessage){
                    hMessage.should.have.property('type', 'hResult');
                    hMessage.payload.should.have.property('status', codes.hResultStatus.INVALID_ATTR);
                    done();
                });
            })
        })
    })

    describe('#processMsgInternal()', function(){
        var cmdMsg;

        before(function(done){
            hClient.once('connect', done);
            hClient.connect(config.logins[0]);
        })

        after(function(done){
            hClient.once('disconnect', done);
            hClient.disconnect();
        })

        beforeEach(function(){
            cmdMsg = config.makeHMessage('hnode@' + hClient.serverDomain, config.logins[1].jid, 'hCommand',{});
        })

        it('should return hResult error INVALID_ATTR if actor is not a valide JID', function(done){
            cmdMsg.actor = "invalid JID";
            hClient.processMsgInternal(cmdMsg, function(hMessage){
                hMessage.should.have.property('type', 'hResult');
                hMessage.payload.should.have.property('status', codes.hResultStatus.MISSING_ATTR);
                done();
            });
        })

        it('should return hResult error NOT_AUTHORIZED if user different than publisher', function(done){
            cmdMsg.publisher = "another@jid";
            hClient.processMsgInternal(cmdMsg, function(hMessage){
                hMessage.should.have.property('type', 'hResult');
                hMessage.payload.should.have.property('status', codes.hResultStatus.NOT_AUTHORIZED);
                done();
            });
        })

        it('should allow to process message if user has resource and publisher doesnt', function(done){
            cmdMsg.payload.cmd = 'hEcho';
            cmdMsg.payload.params = {};
            hClient.processMsgInternal(cmdMsg, function(hMessage){
                hMessage.should.have.property('type', 'hResult');
                hMessage.payload.should.have.property('status', codes.hResultStatus.OK);
                done();
            });
        })

        it('should allow to process message if publisher has resource and user doesnt', function(done){
            cmdMsg.payload.cmd = 'hEcho';
            cmdMsg.payload.params = {};
            hClient.jid = hClient.jid.split("/")[0];
            cmdMsg.publisher = config.logins[1].jid;
            hClient.processMsgInternal(cmdMsg, function(hMessage){
                hMessage.should.have.property('type', 'hResult');
                hMessage.payload.should.have.property('status', codes.hResultStatus.OK);
                done();
            });
        })

        it('should save hCommand and hResult with same _id when persistent=true without msgid and persistent', function(done){
            cmdMsg.persistent = true;
            cmdMsg.payload.cmd = 'hEcho';
            cmdMsg.payload.params = {};
            cmdMsg.payload.params.randomValue = '' + config.db.createPk();

            //Sequence: execCommand, testCommand, testResult

            var testCommand = function(err, item){
                should.not.exist(err);
                should.exist(item);
                item.should.have.property('type', 'hResult');
                item.should.not.have.property('persistent');
                item.should.not.have.property('msgid');

                config.db.get('hMessages').findOne({ _id: item._id}, testResult);
            };

            //Called by testCommand
            var testResult = function(err, item2) {
             should.not.exist(err);
             should.exist(item2);
             item2.should.have.property('type', 'hResult');
             item2.should.not.have.property('persistent');
             item2.should.not.have.property('msgid');
             done();
             };

            hClient.processMsgInternal(cmdMsg, function(hMessage){
                hMessage.should.have.property('type', 'hResult');
                hMessage.payload.should.have.property('status', codes.hResultStatus.OK);

                config.db.get('hMessages').findOne({"payload.result.randomValue": cmdMsg.payload.params.randomValue}, testCommand);

            });
        })

    })

})