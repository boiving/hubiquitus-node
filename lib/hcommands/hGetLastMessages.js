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
 * Recovers last published messages to a channel. The messages recovered will
 * only be returned if they were not transient.
 * Receives as parameter a chid an an optional quantity of messages to recover,
 * if this quantity is not specified the default value from the channel will be
 * tried and if not the default value of the command.
 */
var status = require('../codes.js').hResultStatus;
var db = require('../mongo.js').db;

var hGetLastMessages = function(){
    //Default max quantity of messages to be returned. This will be used
    //If a max quantity is not specified and if there is not a default value for the channel
    this.quant = 10;
};

/**
 * Method executed each time an hCommand with cmd = 'hGetLastMessages' is received.
 * Once the execution finishes we should call the callback.
 * @param hCommand - hCommand received with cmd = 'hGetLastMessages'
 * @param context - Models from the database to store/search data. See lib/mongo.js
 * @param cb(status, result) - function that receives arg:
 *    status: //Constant from var status to indicate the result of the hCommand
 *    result: [hMessage]
 */
hGetLastMessages.prototype.exec = function(hCommand, context, cb){
    var params = hCommand.params;

    if( !params || typeof params !== 'object')
        return cb(status.MISSING_ATTR, 'invalid params object received');

    //Test for missing chid
    if( !params.chid )
        return cb(status.MISSING_ATTR, 'command missing chid');

    var sender = hCommand.sender.replace(/\/.*/, '');
    var chid = params.chid;
    var quant = this.quant;

    var channel = db.cache.hChannels[chid];

    if(!channel)
        return cb(status.NOT_AVAILABLE, 'the channel does not exist');

    if(channel.participants.indexOf(sender) > -1 && channel.active == true){

        var it = 0;
        if(channel.headers) {
            while(it < channel.headers.length && channel.headers[it].hK != 'MAX_MSG_RETRIEVAL') it++;

            if(channel.headers[it])
                quant = params.nbLastMsg || channel.headers[it].hV || quant; //In case header mal format
            else
                quant = params.nbLastMsg || quant;
        } else
            quant = params.nbLastMsg || quant;

        quant = parseInt(quant);

        //Test if quant field by the user is a number
        if(isNaN(quant))
            quant = this.quant;

        var hMessages = [];
        var stream = db.get(channel._id).find({}).sort({published:-1}).skip(0).limit(quant).streamRecords();
        stream.on("data", function(hMessage) {
            hMessages.chid = hMessage._id;
            delete hMessage._id;
            hMessages.push(hMessage);
        });
        stream.on("end", function(){
            cb(status.OK, hMessages);
        });

    }else{
        cb(status.NOT_AUTHORIZED, 'not authorized to retrieve messages from "'+ chid);
    }

};

exports.Command = hGetLastMessages;