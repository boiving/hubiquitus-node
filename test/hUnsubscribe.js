/*
 * Copyright (c) Novedia Group 2012.
 *
 *     This file is part of Hubiquitus.
 *
 *     Hubiquitus is free software: you can redistribute it and/or modify
 *     it under the terms of the GNU General Public License as published by
 *     the Free Software Foundation, either version 3 of the License, or
 *     (at your option) any later version.
 *
 *     Hubiquitus is distributed in the hope that it will be useful,
 *     but WITHOUT ANY WARRANTY; without even the implied warranty of
 *     MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *     GNU General Public License for more details.
 *
 *     You should have received a copy of the GNU General Public License
 *     along with Hubiquitus.  If not, see <http://www.gnu.org/licenses/>.
 */

var should = require('should');
var Controller = require('../lib/hcommand_controller.js').Controller;
var mongoose = require('mongoose');

global.log = {debug: function(a){},info: function(a){},warn: function(a){},error: function(a){}};


/*
 NEEDS BEFORE hSubscribe
 */
describe('hUnsubscribe', function(){

    var hCommandController;
    var cmd;
    var status;
    var params;
    var existingCHID = 'Existing ID';
    var existingJID = 'u1@localhost';
    var mongoURI = 'mongodb://localhost/test';

    describe('#hUnsubscribe', function(){
        before(function(){
            params = {
                jid: 'hnode.localhost',
                password: 'password',
                host: 'localhost',
                'mongo.URI' : mongoURI,
                port: 5276,
                modulePath : 'lib/hcommands',
                timeout : 5000
            };
            status = require('../lib/codes.js').hResultStatus;
        })

        beforeEach(function(){
            cmd= {
                reqid  : 'hCommandTest123',
                sender : existingJID,
                sid : 'fake sid',
                sent : new Date(),
                cmd : 'hUnsubscribe',
                params : {chid: existingCHID}
            };
            hCommandController = new Controller(params);
        })

        after(function(done){
            mongoose.connect(mongoURI);
            mongoose.connection.close(done);
        })

        it('should emit hResult error when missing params', function(done){
            hCommandController.on('hResult', function(res){
                should.exist(res);
                res.should.have.property('hResult');
                var hResult = res.hResult;
                hResult.should.have.property('cmd', cmd.cmd);
                hResult.should.have.property('reqid', cmd.reqid);
                hResult.should.have.property('status', status.MISSING_ATTR);
                hResult.should.have.property('result').and.be.a('string');
                done();
            });
            delete cmd['params'];
            hCommandController.emit('hCommand', {hCommand: cmd});
        })

        it('should emit hResult error when chid doesnt exist', function(done){
            hCommandController.on('hResult', function(res){
                should.exist(res);
                res.should.have.property('hResult');
                res.hResult.should.have.property('cmd', cmd.cmd);
                res.hResult.should.have.property('reqid', cmd.reqid);
                res.hResult.should.have.property('status').and.equal(status.INVALID_ATTR);
                res.hResult.should.have.property('result').and.be.a('string');
                done();
            });
            cmd.params = {chid: 'this CHID does not exist'};
            hCommandController.emit('hCommand', {hCommand: cmd});
        })

        it('should emit hResult error if not subscribed', function(done){
            hCommandController.on('hResult', function(res){
                should.exist(res);
                res.should.have.property('hResult');
                var hResult = res.hResult;
                hResult.should.have.property('cmd', cmd.cmd);
                hResult.should.have.property('reqid', cmd.reqid);
                hResult.should.have.property('status', status.INVALID_ATTR);
                hResult.should.have.property('result').and.be.a('string');
                done();
            });
            cmd.params = {chid: 'this CHID does not exist'};
            cmd.sender = existingJID;
            hCommandController.emit('hCommand', {hCommand: cmd});
        })

        it('should emit hResult when correct', function(done){
            hCommandController.on('hResult', function(res){
                should.exist(res);
                res.should.have.property('hResult');
                var hResult = res.hResult;
                hResult.should.have.property('cmd', cmd.cmd);
                hResult.should.have.property('reqid', cmd.reqid);
                hResult.should.have.property('status', status.OK);
                done();
            });
            cmd.params = {chid: existingCHID};
            cmd.sender = existingJID;
            hCommandController.emit('hCommand', {hCommand: cmd});
        })

    })
})