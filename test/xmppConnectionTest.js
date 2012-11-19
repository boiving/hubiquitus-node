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

describe('XMPP Connection', function(){

    var ConnectionConst= require('../lib/server_connectors/xmpp_connection.js').Connection;
    var connection = new ConnectionConst();
    var xmlElement = require('../lib/server_connectors/xmpp_connection.js').Element;


    before(config.beforeFN)

    after(config.afterFN)

    describe('#xmppConnect()', function(){
        var xmppOptions;

        beforeEach(function(){
            xmppOptions = JSON.parse(JSON.stringify(config.logins[0]));
            connection = new ConnectionConst();
        })

        afterEach(function(done){
            connection.once('disconnect', done);
            connection.xmppDisconnect();
        })

        it('should emit an event when online', function(done){
            connection.once('online', done);
            connection.xmppConnect(xmppOptions);
        })

        it('should emit an error when wrong authentication', function(done){
            xmppOptions.password = 'another password';
            connection.once('error', function(error){
                should.exist(error);
                error.code.should.be.eql(codes.errors.AUTH_FAILED);
                error.msg.should.be.a('string');
                done() });
            connection.xmppConnect(xmppOptions);
        })

        it('should emit an error when invalid jid', function(done){
            xmppOptions.jid = 'not valid';
            connection.once('error', function(error){
                should.exist(error);
                error.code.should.be.eql(codes.errors.JID_MALFORMAT);
                error.msg.should.be.a('string');
                done() });
            connection.xmppConnect(xmppOptions);
        })

    })

    describe('#xmppDisconnect()', function(){
        var xmppOptions;

        beforeEach(function(){
            xmppOptions = JSON.parse(JSON.stringify(config.logins[0]));
            connection = new ConnectionConst();
        })

        afterEach(function(done){
            connection.once('disconnect', done);
            connection.xmppDisconnect();
        })

        it('should emit disconnect if disconnect when connected', function(done){
            connection.once('online', function(){
                connection.once('disconnect', done);
                connection.xmppDisconnect();
            });
            connection.xmppConnect(xmppOptions);
        })

        it('should emit disconnect even if already disconnected', function(done){
            connection.once('disconnect', done);
            connection.xmppDisconnect();
        })
    })

    describe('#send()', function(){
        var xmppOptions;

        beforeEach(function(done){
            connection = new ConnectionConst();
            xmppOptions = JSON.parse(JSON.stringify(config.logins[0]));
            connection.once('online', done);
            connection.xmppConnect(xmppOptions);
        })

        afterEach(function(done){
            connection.once('disconnect', done);
            connection.xmppDisconnect();
        })

        it('should not throw error if trying to send without being connected', function(done){
            connection.once('disconnect', function(){
                connection.send(new xmlElement('presence'));
                done();
            });
            connection.xmppDisconnect();
        })

        it('should receive message sent to ourselves if connected', function(done){
            connection.xmppConnection.on('stanza', function(stanza){
                if(stanza.attrs.from == connection.jid)
                    done();
            })
            connection.send(new xmlElement('presence'));
        })
    })

})