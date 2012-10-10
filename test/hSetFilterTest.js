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

describe('hSetFilter', function(){

    var config = require('./_config.js');

    var hResultStatus = require('../lib/codes.js').hResultStatus;
    var hCommandController = new config.cmdController(config.cmdParams);

    var cmd = {};
    var activeChan = config.getNewCHID();
    var inactiveChan = config.getNewCHID();

    var hClientConst = require('../lib/hClient.js').hClient;
    var hClient = new hClientConst(config.cmdParams);

    before(config.beforeFN);

    after(config.afterFN);

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

    before(function(done){
        this.timeout(5000);
        config.createChannel(inactiveChan, [config.logins[0].jid], config.logins[0].jid, false, done);
    })

    beforeEach(function(){
        cmd = config.makeHMessage('hnode@localhost', config.logins[0].jid, 'hCommand',{});
        cmd.msgid = 'testCmd';
        cmd.payload = {
            cmd : 'hSetFilter',
            params : {}
        };
    })

    it('should return hResult OK if params filter is empty', function(done){
        hClient.processMsgInternal(cmd, function(hMessage){
            hMessage.should.have.property('ref', cmd.msgid);
            hMessage.payload.should.have.property('status', hResultStatus.OK);
            done();
        });
    })

    it('should return hResult INVALID_ATTR if params filter is not an object', function(done){
        cmd.payload.params = 'a string';
        hClient.processMsgInternal(cmd, function(hMessage){
            hMessage.should.have.property('ref', cmd.msgid);
            hMessage.payload.should.have.property('status', hResultStatus.INVALID_ATTR);
            done();
        });
    })

    it('should return hResult INVALID_ATTR if filter does not start with a correct operand', function(done){
        cmd.payload.params = {bad:{attribut:true}};
        hClient.processMsgInternal(cmd, function(hMessage){
            hMessage.should.have.property('ref', cmd.msgid);
            hMessage.payload.should.have.property('status', hResultStatus.INVALID_ATTR);
            hMessage.payload.should.have.property('result', 'A filter must start with a valid operand');
            done();
        });
    })

    it('should return hResult INVALID_ATTR if filter with operand eq/ne/lt/lte/gt/gte/in/nin is not an object', function(done){
        cmd.payload.params = {
            eq:'string',
            ne:'string',
            lt:'string',
            lte:'string',
            gt:'string',
            gte:'string',
            in:'string',
            nin:'string'
        };
        hClient.processMsgInternal(cmd, function(hMessage){
            hMessage.should.have.property('ref', cmd.msgid);
            hMessage.payload.should.have.property('status', hResultStatus.INVALID_ATTR);
            hMessage.payload.should.have.property('result', 'The attribute of an operand eq must be an object');
            done();
        });
    })

    it('should return hResult INVALID_ATTR if filter with operand and/or/nor is not an array', function(done){
        cmd.payload.params = {
            and:{attribut:false},
            or:{attribut:false},
            nor:{attribut:false}
        };
        hClient.processMsgInternal(cmd, function(hMessage){
            hMessage.should.have.property('ref', cmd.msgid);
            hMessage.payload.should.have.property('status', hResultStatus.INVALID_ATTR);
            hMessage.payload.should.have.property('result', 'The attribute must be an array with at least 2 elements');
            done();
        });
    })

    it('should return hResult INVALID_ATTR if filter with operand and/or/nor is an array of 1 element', function(done){
        cmd.payload.params = {
            and:[{attribut:false}],
            or:[{attribut:false}],
            nor:[{attribut:false}]
        };
        hClient.processMsgInternal(cmd, function(hMessage){
            hMessage.should.have.property('ref', cmd.msgid);
            hMessage.payload.should.have.property('status', hResultStatus.INVALID_ATTR);
            hMessage.payload.should.have.property('result', 'The attribute must be an array with at least 2 elements');
            done();
        });
    })

    it('should return hResult INVALID_ATTR if filter with operand not is an valid object', function(done){
        cmd.payload.params = {
            not:[{attribut:false}]
        };
        hClient.processMsgInternal(cmd, function(hMessage){
            hMessage.should.have.property('ref', cmd.msgid);
            hMessage.payload.should.have.property('status', hResultStatus.INVALID_ATTR);
            hMessage.payload.should.have.property('result', 'The attribute of an operand "not" must be an object');
            done();
        });
    })

    it('should return hResult INVALID_ATTR if filter with operand "not" not contain valid operand', function(done){
        cmd.payload.params = {
            not:{bad:{attribut:false}}
        };
        hClient.processMsgInternal(cmd, function(hMessage){
            hMessage.should.have.property('ref', cmd.msgid);
            hMessage.payload.should.have.property('status', hResultStatus.INVALID_ATTR);
            hMessage.payload.should.have.property('result', 'A filter must start with a valid operand')
            done();
        });
    })

    it('should return hResult INVALID_ATTR if filter with operand relevant is not a boolean', function(done){
        cmd.payload.params = {
            relevant:'string'
        };
        hClient.processMsgInternal(cmd, function(hMessage){
            hMessage.should.have.property('ref', cmd.msgid);
            hMessage.payload.should.have.property('status', hResultStatus.INVALID_ATTR);
            hMessage.payload.should.have.property('result', 'The attribute of an operand "relevant" must be a boolean')
            done();
        });
    })

    it('should return hResult INVALID_ATTR if filter with operand geo have not attribut radius', function(done){
        cmd.payload.params = {
            geo:{
                lat:12,
                lng:24
            }
        };
        hClient.processMsgInternal(cmd, function(hMessage){
            hMessage.should.have.property('ref', cmd.msgid);
            hMessage.payload.should.have.property('status', hResultStatus.INVALID_ATTR);
            hMessage.payload.should.have.property('result', 'Attributes of an operand "geo" must be numbers')
            done();
        });
    })

    it('should return hResult INVALID_ATTR if filter with operand geo have not attribut lat', function(done){
        cmd.payload.params = {
            geo:{
                lng:24,
                radius:10000
            }
        };
        hClient.processMsgInternal(cmd, function(hMessage){
            hMessage.should.have.property('ref', cmd.msgid);
            hMessage.payload.should.have.property('status', hResultStatus.INVALID_ATTR);
            hMessage.payload.should.have.property('result', 'Attributes of an operand "geo" must be numbers')
            done();
        });
    })

    it('should return hResult INVALID_ATTR if filter with operand geo have not attribut lng', function(done){
        cmd.payload.params = {
            geo:{
                lat:12,
                radius:10000
            }
        };
        hClient.processMsgInternal(cmd, function(hMessage){
            hMessage.should.have.property('ref', cmd.msgid);
            hMessage.payload.should.have.property('status', hResultStatus.INVALID_ATTR);
            hMessage.payload.should.have.property('result', 'Attributes of an operand "geo" must be numbers')
            done();
        });
    })

    it('should return hResult INVALID_ATTR if attribut lat of filter geo is not a number', function(done){
        cmd.payload.params = {
            geo:{
                lat:'string',
                lng:24,
                radius:10000
            }
        };
        hClient.processMsgInternal(cmd, function(hMessage){
            hMessage.should.have.property('ref', cmd.msgid);
            hMessage.payload.should.have.property('status', hResultStatus.INVALID_ATTR);
            hMessage.payload.should.have.property('result', 'Attributes of an operand "geo" must be numbers')
            done();
        });
    })

    it('should return hResult INVALID_ATTR if attribut lng of filter geo is not a number', function(done){
        cmd.payload.params = {
            geo:{
                lat:12,
                lng:'string',
                radius:10000
            }
        };
        hClient.processMsgInternal(cmd, function(hMessage){
            hMessage.should.have.property('ref', cmd.msgid);
            hMessage.payload.should.have.property('status', hResultStatus.INVALID_ATTR);
            hMessage.payload.should.have.property('result', 'Attributes of an operand "geo" must be numbers')
            done();
        });
    })

    it('should return hResult INVALID_ATTR if attribut lat of filter geo is not a number', function(done){
        cmd.payload.params = {
            geo:{
                lat:12,
                lng:24,
                radius:'string'
            }
        };
        hClient.processMsgInternal(cmd, function(hMessage){
            hMessage.should.have.property('ref', cmd.msgid);
            hMessage.payload.should.have.property('status', hResultStatus.INVALID_ATTR);
            hMessage.payload.should.have.property('result', 'Attributes of an operand "geo" must be numbers')
            done();
        });
    })
})