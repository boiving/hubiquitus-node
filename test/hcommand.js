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
var config = require('./_config.js');

describe('hCommand', function(){

    var hCommandController;
    var cmd;
    var status = require('../lib/codes.js').hResultStatus;
    var params = JSON.parse(JSON.stringify(config.cmdParams));

    before(function(done){
        config.db.on('connect', done);
        config.db.connect(config.mongoURI);

        params.modulePath = 'test/aux';
        params.timeout = 1000;
    })

    after(function(done){
        config.db.on('disconnect', done);
        config.db.disconnect();
    })


    beforeEach(function(){
        cmd = {
            reqid  : 'hCommandTest123',
            sender : config.validJID,
            sid : 'fake sid',
            sent : new Date(),
            cmd : 'dummyCommand',
            params: {}
        };

        hCommandController = new config.cmdController(params);
    })

    it('should call module when module exists', function(done){
        hCommandController.execCommand(cmd, null, function(hResult){
            hResult.should.have.property('status', status.OK);
            done();
        });
    })

    it('should call module when cmd with different case', function(done){
        cmd.cmd = 'dummycommand';
        hCommandController.execCommand(cmd, null, function(hResult){
            hResult.should.have.property('status', status.OK);
            done();
        });
    })

    it('should not allow to execute a command if user different than sender', function(done){
        hCommandController.execCommand(cmd, 'another@jid', function(hResult){
            hResult.should.have.property('status', status.NOT_AUTHORIZED);
            done();
        });
    })

    it('should allow to execute a command if user has resource and sender doesnt', function(done){
        hCommandController.execCommand(cmd, config.validJID + '/resource', function(hResult){
            hResult.should.have.property('status', status.OK);
            done();
        });
    })

    it('should allow to execute a command if sender has resource and user doesnt', function(done){
        cmd.sender = config.validJID + '/resource';
        hCommandController.execCommand(cmd, config.validJID, function(hResult){
            hResult.should.have.property('status', status.OK);
            done();
        });
    })

    it('should return hResult when command not found', function(done){
        cmd.cmd = 'inexistent command';
        hCommandController.execCommand(cmd, null, function(hResult){
            hResult.should.have.property('status', status.NOT_AVAILABLE);
            done();
        });
    })

    it('should return hResult when command timeout', function(done){
        cmd.cmd = 'nothingCommand'; //Does nothing, forces timeout
        hCommandController.execCommand(cmd, null, function(hResult){
            hResult.should.have.property('status', status.EXEC_TIMEOUT);
            done();
        });
    })

    it('should not allow command to call cb if after timeout', function(done){
        this.timeout(3000);

        cmd.cmd = 'lateFinisher'; //Calls callback at 2seg
        hCommandController.execCommand(cmd, null, function(hResult){
            hResult.should.have.property('status', status.EXEC_TIMEOUT);
            done();
        });
    })

    it('should allow command to change timeout', function(done){
        this.timeout(4000);

        cmd.cmd = 'timeoutChanger'; //Calls callback at 2seg
        hCommandController.execCommand(cmd, null, function(hResult){
            hResult.should.have.property('status', status.OK);
            done();
        });
    })

    it('should save hCommand and hResult with same _id when transient=false without reqid and transient', function(done){
        cmd.transient = false;
        cmd.params.randomValue = '' + config.db.createPk();

        //Sequence: execCommand, testCommand, testResult

        var testCommand = function(err, item){
            should.not.exist(err);
            should.exist(item);
            item.should.have.property('cmd', cmd.cmd);
            item.should.not.have.property('transient');
            item.should.not.have.property('reqid');

            config.db.get('hResults').findOne({ _id: item._id}, testResult);
        };

        //Called by testCommand
        var testResult = function(err, item2) {
            should.not.exist(err);
            should.exist(item2);
            item2.should.have.property('cmd', cmd.cmd);
            item2.should.not.have.property('transient');
            item2.should.not.have.property('reqid');
            done();
        };

        hCommandController.execCommand(cmd, config.validJID, function(hResult){
            hResult.should.have.property('status', status.OK);

            config.db.get('hCommands').findOne({params: {
                randomValue: cmd.params.randomValue
            }}, testCommand);

        });
    })

    it('should return same reqid even if when transient=false reqid changes in mongodb', function(done){
        cmd.transient = false;
        cmd.params.randomValue = '' + config.db.createPk();

        hCommandController.execCommand(cmd, config.validJID, function(hResult){
            hResult.should.have.property('status', status.OK);
            hResult.should.have.property('reqid', cmd.reqid);
            done();
        });
    })

})