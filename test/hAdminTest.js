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
var errors = require('../lib/codes.js').errors;
var hResultStatus = require('../lib/codes.js').hResultStatus;


describe('hAdmin XMPP Connection', function(){

    var hAdmin = config.xmppConnection;

    before(function(done){
        var db = require('../lib/dbPool.js').db.getDb("test");
        db.once('connect', done);
        db.connect(config.mongoURI);
    })

    after(function(done){
        var db = require('../lib/dbPool.js').db.getDb("test");
        db.once('disconnect', done);
        db.disconnect();
    })

    describe('#connect()', function(){
        var xmppOptions;

        beforeEach(function(){
            xmppOptions = JSON.parse(JSON.stringify(config.xmppParams));
        })

        afterEach(function(done){
            hAdmin.once('disconnect', done);
            hAdmin.disconnect();
        })

        it('should emit an event when connected', function(done){
            hAdmin.once('connect', done);
            hAdmin.connect(xmppOptions);
        })

        it('should emit an error when wrong authentication', function(done){
            xmppOptions.password = 'another password';
            hAdmin.once('error', function(error){
                should.exist(error);
                error.code.should.be.eql(errors.AUTH_FAILED);
                error.msg.should.be.a('string');
                done() });
            hAdmin.connect(xmppOptions);
        })

        it('should emit an error when invalid jid', function(done){
            xmppOptions.jid = 'not valid';
            hAdmin.once('error', function(error){
                should.exist(error);
                error.code.should.be.eql(errors.JID_MALFORMAT);
                error.msg.should.be.a('string');
                done() });
            hAdmin.connect(xmppOptions);
        })

    })

    describe('#publishHChannel()', function(){

        var hChannel = {
            type: 'channel',
            actor: '#a channel@localhost',
            owner: config.validJID,
            subscribers: [config.validJID],
            active: true
        };

        beforeEach(function(done){
            hAdmin.once('connect', done);
            hAdmin.connect(config.xmppParams);
        })

        afterEach(function(done){
            hAdmin.once('disconnect', done);
            hAdmin.disconnect();
        })

        it('should do nothing if not connected and a cb was not passed ', function(done){
            hAdmin.once('disconnect', function(){
                hAdmin.publishHChannel(hChannel);
                done();
            });
            hAdmin.disconnect();
        })

        it('should return hResult error NOT_CONNECTED if not connected and cb', function(done){
            hAdmin.once('disconnect', function(){
                hAdmin.publishHChannel(hChannel, function(hMessage){
                    should.exist(hMessage);
                    hMessage.type.should.be.eql('hResult');
                    hMessage.payload.status.should.be.eql(hResultStatus.NOT_CONNECTED);
                    hMessage.payload.result.should.be.a('string');
                    done();
                });
            });
            hAdmin.disconnect();
        })

        it('should execute and do not throw error if correct and no cb', function(){
            hAdmin.publishHChannel(hChannel);
        })


        it('should return hResult OK if correctly executed', function(done){
            hAdmin.publishHChannel(hChannel, function(hMessage){
                should.exist(hMessage);
                hMessage.type.should.be.eql('hResult');
                hMessage.payload.status.should.be.eql(hResultStatus.OK);
                done();
            });
        })

    })

    describe('#processMsgInternal()', function(){
        var cmdMsg, hMsg;

        before(function(done){
            hAdmin.once('connect', done);
            hAdmin.connect(config.logins[0]);
        })

        after(function(done){
            hAdmin.once('disconnect', done);
            hAdmin.disconnect();
        })

        beforeEach(function(){

            cmdMsg = config.makeHMessage('hnode@' + hAdmin.serverDomain, config.logins[1].jid, 'hCommand', {});
            cmdMsg.msgid = 'testCmd';
            cmdMsg.convid = 'testCmd';
        })

        it('should return hResult error INVALID_ATTR if actor is not a valide JID', function(done){
            cmdMsg.actor = "invalid JID";
            hAdmin.processMsgInternal(cmdMsg, function(hMessage){
                hMessage.should.have.property('type', 'hResult');
                hMessage.payload.should.have.property('status', hResultStatus.MISSING_ATTR);
                done();
            });
        })
    })

})