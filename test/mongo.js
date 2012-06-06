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
var db = require('../lib/mongo.js').db;
var errors = require('../lib/codes.js').errors;

global.log = {debug: function(a){},info: function(a){},warn: function(a){},error: function(a){}};

describe('Mongo', function(){

    var uri = 'mongodb://localhost/test';

    describe('#connect', function(){

        afterEach(function(done){
            db.once('disconnect', done);
            db.disconnect();
        })

        it('should emit connect when connected', function(done){
            db.once('connect', done);
            db.connect(uri);
        })

        it('should emit error when a second connection is attempted', function(done){
            db.once('error', function(obj){
                should.exist(obj);
                obj.should.have.property('code', errors.ALREADY_CONNECTED);
                done();
            });

            db.connect(uri);
            db.connect(uri);
        })

        it('should emit error when invalid address', function(done){
            db.once('error', function(obj){
                should.exist(obj);
                obj.should.have.property('code', errors.TECH_ERROR);
                done();
            });

            var fakeUri = 'invalidUri';
            db.connect(fakeUri);
        })

        it('should emit error when timeout', function(done){
            this.timeout(5000);
            db.once('error', function(obj){
                should.exist(obj);
                obj.should.have.property('code', errors.CONN_TIMEOUT);
                done();
            });

            var nonExistentAddress = 'mongodb://a';
            db.connect(nonExistentAddress);
        })

    })
})