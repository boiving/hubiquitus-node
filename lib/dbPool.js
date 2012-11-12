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

/**
 * Mongo Abstraction Layer. This allows access to the different collections
 * that are managed in hubiquitus giving the user some convenience methods
 * to create and recover models.
 *
 * To retrieve data from a collection use db.get(collectionName).find() //See mongodb-native for advanced commands
 *
 * To add validators that will be executed when an element has to be updated/saved:
 * db.get(collectionName).validators.push(validator);
 * validators are functions(doc, cb). They will be executed asynchronously and they should return cb() if correct or
 * cb(<hResult.status>, <msg>) if there  was an error
 *
 * You can add functions that will be executed when an update/save is successful using:
 * db.get(collectionName).onSave = [function(result),...]
 *
 * There is a special collection called 'virtualHMessages'. This collection is virtual, meaning that is used to add
 * validators/ force mandatory attributes for all hMessages but the collection does not exist physically. Each hMessage
 * is saved in a collection named after the channel where it was published or in a collection called hMessages if the
 * message was not published but sent to another user.
 */

var mongo = require('./mongo.js').db,
    log = require('winston');
    opts = require('./options.js');

var codes = require('./codes.js'),
    validators = require('./validators.js');

//Events
var util = require('util'),
    events = require('events').EventEmitter;

var dbInstances = {};

var Db = function(){
    var mongodb = new mongo();
    mongodb.on('error', function(err){
        log.error('Error Connecting to database', err);
        process.exit(1);
    });

    //Start connection to Mongo
    mongodb.connect(opts.options['mongo.URI']);
    dbInstances[mongodb.db.databaseName] = mongodb;

    events.call(this);
};
util.inherits(Db, events);



Db.prototype.getDb = function(dbName, cb){
    dbName = dbName.replace(/\./g,'_')
    var dbInstance = dbInstances[dbName];

    if(dbInstance)
        if(cb){
            if(dbInstance.status === 1) {
                cb(dbInstance);
            } else
                dbInstance.queue.push(cb)
        } else
            return dbInstance;
    else
    {
        var newInstance = new mongo();
        dbInstances[dbName] = newInstance;
        //Create regex to parse/test URI
        var matches = /^mongodb:\/\/(\w+)(:(\d+)|)\/(\w+)$/.exec(opts.options['mongo.URI']);
        //Parse URI
        var host = matches[1],
            port = parseInt(matches[3]) || 27017,
            dbName = dbName;
        var uri = 'mongodb://'+host+':'+port+'/'+dbName

        newInstance.on('error', function(err){
            log.error('Error Connecting to database', err);
            process.exit(1);
        });

        //Start connection to Mongo
        newInstance.connect(uri, function(db) {
            for(var i=0; i<newInstance.queue.length; i++){
                var cb = newInstance.queue.pop();
                cb(db);
            }
        });
        if(!cb)
            return newInstance;
    }
}

exports.db = new Db();