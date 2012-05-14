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


describe('hGetSubscriptions', function(){

    var hCommandController;
    var cmd;
    var status;
    var params;
    var existingCHID = 'Existing ID';
    var validJID = 'u1@localhost';
    var mongoURI = 'mongodb://localhost/test';

    describe('#hSubscribe', function(){
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
                sender : validJID,
                sid : 'fake sid',
                sent : new Date(),
                cmd : 'hGetSubscriptions'
            };
            hCommandController = new Controller(params);
        })

        after(function(done){
            mongoose.connect(mongoURI);
            mongoose.connection.close(done);
        })

        it('should emit hResult ok if user doesnt have subscriptions', function(done){
            hCommandController.on('hResult', function(res){
                should.exist(res);
                res.should.have.property('hResult');
                var hResult = res.hResult;
                hResult.should.have.property('cmd', cmd.cmd);
                hResult.should.have.property('reqid', cmd.reqid);
                hResult.should.have.property('status', status.OK);
                hResult.should.have.property('result').and.be.an.instanceof(Array);
                done();
            });
            cmd.sender = 'dontexist@a';
            hCommandController.emit('hCommand', {hCommand: cmd});
        })

        it('should emit hResult ok if user has have subscriptions', function(done){
            hCommandController.on('hResult', function(res){
                should.exist(res);
                res.should.have.property('hResult');
                var hResult = res.hResult;
                hResult.should.have.property('cmd', cmd.cmd);
                hResult.should.have.property('reqid', cmd.reqid);
                hResult.should.have.property('status', status.OK);
                hResult.should.have.property('result').and.be.an.instanceof(Array);
                done();
            });
            hCommandController.emit('hCommand', {hCommand: cmd});
        })

    })
})