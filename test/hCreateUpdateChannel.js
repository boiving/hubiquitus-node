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

describe('hCreateUpdateChannel', function(){

    var hCommandController = new config.cmdController(config.cmdParams);
    var createCmd;
    var status = require('../lib/codes.js').hResultStatus;
    var splitJID = require('../lib/validators.js').splitJID;

    before(config.beforeFN)

    after(config.afterFN)

    beforeEach(function(){
        createCmd= {
            reqid  : 'hCommandTest123',
            sender : config.validJID,
            sid : 'fake sid',
            sent : new Date(),
            cmd : 'hCreateUpdateChannel',
            params : {
                chid : config.db.createPk(),
                active : true,
                host : '' + new Date(),
                owner : config.validJID,
                participants : [config.validJID]
            }
        };
    })

    it('should return hResult error INVALID_ATTR without params', function(done){
        createCmd.params = null;
        hCommandController.execCommand(createCmd, null, function(hResult){
            hResult.should.have.property('cmd', createCmd.cmd);
            hResult.should.have.property('reqid', createCmd.reqid);
            hResult.should.have.property('status', status.INVALID_ATTR);
            hResult.should.have.property('result').and.be.a('string');
            done();
        });
    })

    it('should return hResult error INVALID_ATTR with params not an object', function(done){
        createCmd.params = 'string';
        hCommandController.execCommand(createCmd, null, function(hResult){
            hResult.should.have.property('cmd', createCmd.cmd);
            hResult.should.have.property('reqid', createCmd.reqid);
            hResult.should.have.property('status', status.INVALID_ATTR);
            hResult.should.have.property('result').and.be.a('string');
            done();
        });
    })

    it('should return hResult error MISSING_ATTR without chid', function(done){
        delete createCmd.params.chid;
        hCommandController.execCommand(createCmd, null, function(hResult){
            hResult.should.have.property('cmd', createCmd.cmd);
            hResult.should.have.property('reqid', createCmd.reqid);
            hResult.should.have.property('status', status.MISSING_ATTR);
            hResult.should.have.property('result').and.be.a('string').and.match(/id/i);
            done();
        });
    })

    it('should return hResult error INVALID_ATTR with empty string as chid', function(done){
        createCmd.params.chid = '';
        hCommandController.execCommand(createCmd, null, function(hResult){
            hResult.should.have.property('cmd', createCmd.cmd);
            hResult.should.have.property('reqid', createCmd.reqid);
            hResult.should.have.property('status', status.INVALID_ATTR);
            hResult.should.have.property('result').and.be.a('string').and.match(/id/i);
            done();
        });
    })

    it('should return hResult error INVALID_ATTR with chid with a different domain', function(done){
        createCmd.params.chid = '#channel@another.domain';
        hCommandController.execCommand(createCmd, null, function(hResult){
            hResult.should.have.property('cmd', createCmd.cmd);
            hResult.should.have.property('reqid', createCmd.reqid);
            hResult.should.have.property('status', status.INVALID_ATTR);
            hResult.should.have.property('result').and.be.a('string');
            done();
        });
    })

    it('should return hResult error INVALID_ATTR with using hAdminChannel as chid', function(done){
        createCmd.params.chid = '#channel@another.domain';
        hCommandController.execCommand(createCmd, null, function(hResult){
            hResult.should.have.property('cmd', createCmd.cmd);
            hResult.should.have.property('reqid', createCmd.reqid);
            hResult.should.have.property('status', status.INVALID_ATTR);
            hResult.should.have.property('result').and.be.a('string');
            done();
        });
    })

    it('should return hResult error INVALID_ATTR if chid is not string castable', function(done){
        createCmd.params.chid = [];
        hCommandController.execCommand(createCmd, null, function(hResult){
            hResult.should.have.property('cmd', createCmd.cmd);
            hResult.should.have.property('reqid', createCmd.reqid);
            hResult.should.have.property('status', status.INVALID_ATTR);
            hResult.should.have.property('result').and.be.a('string').and.match(/chid/i);
            done();
        });
    })

    it('should return hResult error INVALID_ATTR if priority is not a number', function(done){
        createCmd.params.priority = 'not a number';
        hCommandController.execCommand(createCmd, null, function(hResult){
            hResult.should.have.property('cmd', createCmd.cmd);
            hResult.should.have.property('reqid', createCmd.reqid);
            hResult.should.have.property('status', status.INVALID_ATTR);
            hResult.should.have.property('result').and.be.a('string').and.match(/priority/i);
            done();
        });
    })

    it('should return hResult error INVALID_ATTR if priority >5', function(done){
        createCmd.params.priority = 6;
        hCommandController.execCommand(createCmd, null, function(hResult){
            hResult.should.have.property('cmd', createCmd.cmd);
            hResult.should.have.property('reqid', createCmd.reqid);
            hResult.should.have.property('status', status.INVALID_ATTR);
            hResult.should.have.property('result').and.be.a('string').and.match(/priority/i);
            done();
        });
    })

    it('should return hResult error INVALID_ATTR if priority <0', function(done){
        createCmd.params.priority = -1;
        hCommandController.execCommand(createCmd, null, function(hResult){
            hResult.should.have.property('cmd', createCmd.cmd);
            hResult.should.have.property('reqid', createCmd.reqid);
            hResult.should.have.property('status', status.INVALID_ATTR);
            hResult.should.have.property('result').and.be.a('string').and.match(/priority/i);
            done();
        });
    })

    it('should return hResult error INVALID_ATTR with invalid location format', function(done){
        createCmd.params.location = "something";
        hCommandController.execCommand(createCmd, null, function(hResult){
            hResult.should.have.property('cmd', createCmd.cmd);
            hResult.should.have.property('reqid', createCmd.reqid);
            hResult.should.have.property('status', status.INVALID_ATTR);
            done();
        });
    })

    it('should return hResult error MISSING_ATTR if owner is missing', function(done){
        delete createCmd.params.owner;
        hCommandController.execCommand(createCmd, null, function(hResult){
            hResult.should.have.property('cmd', createCmd.cmd);
            hResult.should.have.property('reqid', createCmd.reqid);
            hResult.should.have.property('status', status.MISSING_ATTR);
            hResult.should.have.property('result').and.be.a('string').and.match(/owner/i);
            done();
        });
    })

    it('should return hResult error INVALID_ATTR if owner is an empty string', function(done){
        createCmd.params.owner = '';
        createCmd.sender = '';
        hCommandController.execCommand(createCmd, null, function(hResult){
            hResult.should.have.property('cmd', createCmd.cmd);
            hResult.should.have.property('reqid', createCmd.reqid);
            hResult.should.have.property('status', status.INVALID_ATTR);
            hResult.should.have.property('result').and.be.a('string').and.match(/owner/i);
            done();
        });
    })

    it('should return hResult error INVALID_ATTR if owner JID is not bare', function(done){
        createCmd.params.owner = 'a@b/resource';
        createCmd.sender = 'a@b/resource';
        hCommandController.execCommand(createCmd, null, function(hResult){
            hResult.should.have.property('cmd', createCmd.cmd);
            hResult.should.have.property('reqid', createCmd.reqid);
            hResult.should.have.property('status', status.INVALID_ATTR);
            hResult.should.have.property('result').and.be.a('string').and.match(/owner/i);
            done();
        });
    })

    it('should return hResult error MISSING_ATTR if participants is missing', function(done){
        delete createCmd.params.participants;
        hCommandController.execCommand(createCmd, null, function(hResult){
            hResult.should.have.property('cmd', createCmd.cmd);
            hResult.should.have.property('reqid', createCmd.reqid);
            hResult.should.have.property('status', status.MISSING_ATTR);
            hResult.should.have.property('result').and.be.a('string').and.match(/participant/i);
            done();
        });
    })

    it('should return hResult error INVALID_ATTR if participants is not an array', function(done){
        createCmd.params.participants = '';
        hCommandController.execCommand(createCmd, null, function(hResult){
            hResult.should.have.property('cmd', createCmd.cmd);
            hResult.should.have.property('reqid', createCmd.reqid);
            hResult.should.have.property('status', status.INVALID_ATTR);
            hResult.should.have.property('result').and.be.a('string').and.match(/participant/i);
            done();
        });
    })

    it('should return hResult error INVALID_ATTR if participants has an element that is not a string', function(done){
        createCmd.params.participants = [{not: 'a string'}];
        hCommandController.execCommand(createCmd, null, function(hResult){
            hResult.should.have.property('cmd', createCmd.cmd);
            hResult.should.have.property('reqid', createCmd.reqid);
            hResult.should.have.property('status', status.INVALID_ATTR);
            hResult.should.have.property('result').and.be.a('string').and.match(/participant/i);
            done();
        });
    })

    it('should return hResult error INVALID_ATTR if participants has an element that is not a JID', function(done){
        createCmd.params.participants = ['a@b', 'this is not a JID'];
        hCommandController.execCommand(createCmd, null, function(hResult){
            hResult.should.have.property('cmd', createCmd.cmd);
            hResult.should.have.property('reqid', createCmd.reqid);
            hResult.should.have.property('status', status.INVALID_ATTR);
            hResult.should.have.property('result').and.be.a('string').and.match(/participant/i);
            done();
        });
    })

    it('should return hResult error INVALID_ATTR if participants has an element that is not a bare JID', function(done){
        createCmd.params.participants = ['a@b', 'a@b/resource'];
        hCommandController.execCommand(createCmd, null, function(hResult){
            hResult.should.have.property('cmd', createCmd.cmd);
            hResult.should.have.property('reqid', createCmd.reqid);
            hResult.should.have.property('status', status.INVALID_ATTR);
            hResult.should.have.property('result').and.be.a('string').and.match(/participant/i);
            done();
        });
    })

    it('should return hResult error MISSING_ATTR if active is missing', function(done){
        delete createCmd.params.active;
        hCommandController.execCommand(createCmd, null, function(hResult){
            hResult.should.have.property('cmd', createCmd.cmd);
            hResult.should.have.property('reqid', createCmd.reqid);
            hResult.should.have.property('status', status.MISSING_ATTR);
            hResult.should.have.property('result').and.be.a('string').and.match(/active/i);
            done();
        });
    })

    it('should return hResult error INVALID_ATTR if active is not a boolean', function(done){
        createCmd.params.active = 'this is a string';
        hCommandController.execCommand(createCmd, null, function(hResult){
            hResult.should.have.property('cmd', createCmd.cmd);
            hResult.should.have.property('reqid', createCmd.reqid);
            hResult.should.have.property('status', status.INVALID_ATTR);
            hResult.should.have.property('result').and.be.a('string').and.match(/active/i);
            done();
        });
    })

    it('should return hResult error INVALID_ATTR if headers is not an object', function(done){
        createCmd.params.headers= 'something';
        hCommandController.execCommand(createCmd, null, function(hResult){
            hResult.should.have.property('cmd', createCmd.cmd);
            hResult.should.have.property('reqid', createCmd.reqid);
            hResult.should.have.property('status', status.INVALID_ATTR);
            hResult.should.have.property('result').and.be.a('string').and.match(/header/i);
            done();
        });
    })

    it('should return hResult error NOT_AUTHORIZED if owner different than sender', function(done){
        createCmd.params.owner = 'another@another.jid';
        hCommandController.execCommand(createCmd, null, function(hResult){
            hResult.should.have.property('cmd', createCmd.cmd);
            hResult.should.have.property('reqid', createCmd.reqid);
            hResult.should.have.property('status', status.NOT_AUTHORIZED);
            done();
        });
    })

    it('should return hResult OK if sender has resource and owner doesnt', function(done){
        createCmd.sender = config.validJID + '/resource';
        createCmd.params.owner = config.validJID;
        hCommandController.execCommand(createCmd, null, function(hResult){
            hResult.should.have.property('cmd', createCmd.cmd);
            hResult.should.have.property('reqid', createCmd.reqid);
            hResult.should.have.property('status', status.OK);
            done();
        });
    })

    it('should return hResult OK if chid does not have domain nor #', function(done){
        createCmd.params.chid = 'aValidChannelName';
        hCommandController.execCommand(createCmd, null, function(hResult){
            hResult.should.have.property('cmd', createCmd.cmd);
            hResult.should.have.property('reqid', createCmd.reqid);
            hResult.should.have.property('status', status.OK);
            done();
        });
    })

    it('should return hResult OK if chid does not have domain', function(done){
        createCmd.params.chid = '#aValidChannelName';
        hCommandController.execCommand(createCmd, null, function(hResult){
            hResult.should.have.property('cmd', createCmd.cmd);
            hResult.should.have.property('reqid', createCmd.reqid);
            hResult.should.have.property('status', status.OK);
            done();
        });
    })

    it('should return hResult OK if chid is fully compliant with #chid@domain', function(done){
        createCmd.params.chid = '#chid@' + splitJID(config.validJID)[1];
        hCommandController.execCommand(createCmd, null, function(hResult){
            hResult.should.have.property('cmd', createCmd.cmd);
            hResult.should.have.property('reqid', createCmd.reqid);
            hResult.should.have.property('status', status.OK);
            done();
        });
    })

    it('should return hResult OK without any optional attributes', function(done){
        hCommandController.execCommand(createCmd, null, function(hResult){
            hResult.should.have.property('cmd', createCmd.cmd);
            hResult.should.have.property('reqid', createCmd.reqid);
            hResult.should.have.property('status', status.OK);
            done();
        });
    })

    it('should return hResult ok with every attribute (including optional) correct', function(done){
        createCmd.params.chdesc = 'a';
        createCmd.params.priority = 3;
        createCmd.params.location = {lng : 's'};
        createCmd.params.headers = {key: 'value'};
        hCommandController.execCommand(createCmd, null, function(hResult){
            hResult.should.have.property('cmd', createCmd.cmd);
            hResult.should.have.property('reqid', createCmd.reqid);
            hResult.should.have.property('status', status.OK);
            done();
        });
    })

    it('should update cache after successful saving of hChannel', function(done){
        var chid = '#' + config.db.createPk() + '@' + splitJID(config.validJID)[1];
        createCmd.params.chid = chid;
        createCmd.params.priority = 3;
        hCommandController.execCommand(createCmd, null, function(hResult){
            hResult.should.have.property('status', status.OK);
            should.exist(config.db.cache.hChannels[chid]);
            config.db.cache.hChannels[chid].should.have.property('priority', 3);
            done();
        });
    })


    describe('#Update Channel', function(){
        //Channel that will be created and updated
        var existingCHID = '#' + config.db.createPk() + '@' + splitJID(config.validJID)[1];

        before(function(done){
            config.createChannel(existingCHID, [config.validJID], config.validJID, true, done);
        })

        it('should return hResult ok if chid exists updating', function(done){
            createCmd.params.chid = existingCHID;
            createCmd.params.participants = ['u2@another'];
            hCommandController.execCommand(createCmd, null, function(hResult){
                hResult.should.have.property('cmd', createCmd.cmd);
                hResult.should.have.property('reqid', createCmd.reqid);
                hResult.should.have.property('status', status.OK);
                config.db.cache.hChannels[existingCHID].participants.should.be.eql(createCmd.params.participants);
                done();
            });
        })

        it('should return hResult OK if a new participant is added', function(done){
            createCmd.params.chid = existingCHID;
            createCmd.params.participants = [config.validJID, 'u2@another2'];
            hCommandController.execCommand(createCmd, null, function(hResult){
                hResult.should.have.property('status', status.OK);
                done();
            });
        })

        it('should return hResult OK if an old participant is removed', function(done){
            createCmd.params.chid = existingCHID;
            createCmd.params.participants = ['u2@another2'];
            hCommandController.execCommand(createCmd, null, function(hResult){
                hResult.should.have.property('status', status.OK);
                done();
            });
        })

        it('should return hResult error if sender tries to update owner', function(done){
            createCmd.params.owner = 'a@jid.different';
            createCmd.params.chid = existingCHID;
            hCommandController.execCommand(createCmd, null, function(hResult){
                hResult.should.have.property('cmd', createCmd.cmd);
                hResult.should.have.property('reqid', createCmd.reqid);
                hResult.should.have.property('status', status.NOT_AUTHORIZED);
                done();
            });
        })

    })
})