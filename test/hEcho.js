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
var hEchoModule = require('../lib/hcommands/hEcho.js').Command;
var config = require('./_config.js');

describe('hEcho', function(){

    var echoCmd;
    var hEcho;
    var status = require('../lib/codes.js').hResultStatus;
    var hClientConst = require('../lib/hClient.js').hClient;
    var hClient = new hClientConst(config.cmdParams);

    before(config.beforeFN)

    after(config.afterFN)

    before(function(done){
        hClient.once('connect', done);
        hClient.connect(config.logins[0]);
    })

    after(function(done){
        hClient.once('disconnect', done);
        hClient.disconnect();
    })

    beforeEach(function(done){
        echoCmd = config.makeHMessage('hnode@localhost', config.logins[0].jid, 'hCommand',{});
        echoCmd.msgid = 'hCommandTest123';
        echoCmd.payload = {
                cmd : 'hEcho',
                params : {hello: 'world'}
        } ;

        hEcho = new hEchoModule();
        done();
    })

    it('should return hResult error if the hMessage can not be treat', function(done){
        echoCmd.payload.params.error = 'DIV0';
        hClient.processMsgInternal(echoCmd, function(hMessage){
            hMessage.should.have.property('ref', echoCmd.msgid);
            hMessage.payload.should.have.property('status', status.TECH_ERROR);
            done();
        });
    })

    describe('#Execute hEcho', function(){
        it('should emit result echoing input', function(done){
            hEcho.exec(echoCmd, null, function(statusValue, resultValue){
                should.exist(statusValue);
                should.exist(resultValue);
                statusValue.should.be.equal(status.OK);
                resultValue.should.be.equal(echoCmd.payload.params);
                done();
            });
        })
    })

})