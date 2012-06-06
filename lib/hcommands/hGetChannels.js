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

var status = require('../codes.js').hResultStatus;
var db = require('../mongo.js').db;

var hGetChannels = function(){
};

/**
 * Recovers the channels from the database and returns a list of channels
 * Once the execution finishes cb is called.
 * @param hCommand - hCommand received with cmd = 'hGetChannels'
 * @param context - Auxiliary functions,attrs from the controller/ db models.
 * @param cb(status, result) - function that receives args:
 *    status: //Constant from var status to indicate the result of the hCommand
 *    result: hChannels array
 */
hGetChannels.prototype.exec = function(hCommand, context, cb){
    //Recover list of all the channels (use cache)
    var cache = db.cache.hChannels;
    var channels = [];
    var hChannel;

    for(var chan in cache)
        if(cache.hasOwnProperty(chan)){
            //http://stackoverflow.com/questions/9418967/underscores-cloning-of-mongoose-objects-and-deleting-properties-not-working
            hChannel = JSON.parse(JSON.stringify(cache[chan])); //Recursive cloning, not shallow
            delete hChannel._id;
            channels.push(hChannel);
        }

    cb(status.OK, channels);
};

exports.Command = hGetChannels;