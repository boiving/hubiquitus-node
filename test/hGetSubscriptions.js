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

describe('hGetSubscriptions', function(){

    var hCommandController = new config.cmdController(config.cmdParams);
    var cmd;
    var status = require('../lib/codes.js').hResultStatus;
    var actor = config.getNewCHID();
    var actorInactive = config.getNewCHID();


    before(config.beforeFN)

    after(config.afterFN)

    before(function(done){
        this.timeout(5000);
        config.createChannel(actor, [config.validJID], config.validJID, true, done);
    })

    //Subscribe to channel
    before(function(done){
        config.subscribeToChannel(config.validJID, actor, done);
    })

    //Create it active
    before(function(done){
        this.timeout(5000);
        config.createChannel(actorInactive, [config.validJID], config.validJID, true, done);
    })

    //Subscribe to channel
    before(function(done){
        config.subscribeToChannel(config.validJID, actorInactive, done);
    })

    //Make it inactive
    before(function(done){
        this.timeout(5000);
        config.createChannel(actorInactive, [config.validJID], config.validJID, false, done);
    })

    beforeEach(function(){
        cmd = config.makeHMessage('hnode@localhost', config.validJID, 'hCommand',{});
        cmd.msgid = 'hCommandTest123';
        cmd.payload = {
                cmd : 'hGetSubscriptions'
        };
    })

    it('should return hResult ok with an array as result if user doesnt have subscriptions', function(done){
        cmd.publisher = 'dontexist@a';
        hCommandController.execCommand(cmd, function(hMessage){
            hMessage.should.have.property('ref', cmd.msgid);
            hMessage.payload.should.have.property('result').and.be.an.instanceof(Array).and.have.lengthOf(0);
            done();
        });
    })

    it('should return hResult ok with an array as result if user has subscriptions', function(done){
        hCommandController.execCommand(cmd, function(hMessage){
            hMessage.should.have.property('ref', cmd.msgid);
            hMessage.payload.should.have.property('result').and.be.an.instanceof(Array);
            done();
        });
    })

    it('should return hResult ok with an array with a actor subscribed', function(done){
        hCommandController.execCommand(cmd, function(hMessage){
            hMessage.should.have.property('ref', cmd.msgid);
            hMessage.payload.result.should.include(actor);
            done();
        });
    })

    it('should return hResult ok with an array without a actor subscribed if channel is currently inactive', function(done){
        hCommandController.execCommand(cmd, function(hMessage){
            hMessage.should.have.property('ref', cmd.msgid);
            hMessage.payload.result.should.not.include(actorInactive);
            done();
        });
    })

})