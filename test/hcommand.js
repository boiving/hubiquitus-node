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

describe('hCommand', function(){

    var hCommandController;
    var cmdMsg;
    var status = require('../lib/codes.js').hResultStatus;
    var params = JSON.parse(JSON.stringify(config.cmdParams));
    params.modulePath = 'test/aux';
    params.timeout = 1000;

    before(config.beforeFN)

    after(config.afterFN)

    beforeEach(function(){
        cmdMsg = config.makeHMessage('hnode@localhost', config.validJID, 'hCommand',{});
        cmdMsg.payload = {
                cmd : 'dummyCommand',
                params : {}
        };


        hCommandController = new config.cmdController(params);
    })

    it('should call module when module exists', function(done){
        hCommandController.execCommand(cmdMsg, function(hMessage){
            hMessage.should.have.property('type', 'hResult');
            hMessage.payload.should.have.property('status', status.OK);
            done();
        });
    })

    it('should call module when cmd with different case', function(done){
        cmdMsg.payload.cmd = 'dummycommand';
        hCommandController.execCommand(cmdMsg, function(hMessage){
            hMessage.should.have.property('type', 'hResult');
            hMessage.payload.should.have.property('status', status.OK);
            done();
        });
    })

    it('should return hResult error NOT_AVAILABLE when command not found', function(done){
        cmdMsg.payload.cmd = 'inexistent command';
        hCommandController.execCommand(cmdMsg, function(hMessage){
            hMessage.should.have.property('type', 'hResult');
            hMessage.payload.should.have.property('status', status.NOT_AVAILABLE);
            done();
        });
    })

    it('should return hResult error EXEC_TIMEOUT when command timeout', function(done){
        cmdMsg.payload.cmd = 'nothingCommand'; //Does nothing, forces timeout
        hCommandController.execCommand(cmdMsg, function(hMessage){
            hMessage.should.have.property('type', 'hResult');
            hMessage.payload.should.have.property('status', status.EXEC_TIMEOUT);
            done();
        });
    })

    it('should not allow command to call cb if after timeout', function(done){
        this.timeout(3000);

        cmdMsg.payload.cmd = 'lateFinisher'; //Calls callback at 2seg
        hCommandController.execCommand(cmdMsg, function(hMessage){
            hMessage.should.have.property('type', 'hResult');
            hMessage.payload.should.have.property('status', status.EXEC_TIMEOUT);
            done();
        });
    })

    it('should allow command to change timeout', function(done){
        this.timeout(4000);

        cmdMsg.payload.cmd = 'timeoutChanger'; //Calls callback at 2seg
        hCommandController.execCommand(cmdMsg, function(hMessage){
            hMessage.should.have.property('type', 'hResult');
            hMessage.payload.should.have.property('status', status.OK);
            done();
        });
    })

    it('should return same msgid even if when persistent=true msgid changes in mongodb', function(done){
        cmdMsg.persistent = true;
        cmdMsg.payload.params.randomValue = '' + config.db.createPk();

        hCommandController.execCommand(cmdMsg, function(hMessage){
            hMessage.payload.should.have.property('status', status.OK);
            hMessage.should.have.property('ref', cmdMsg.msgid);
            done();
        });
    })

})