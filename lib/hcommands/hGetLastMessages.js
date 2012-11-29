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


/**
 * Recovers last published messages to a channel. The messages recovered will
 * only be returned if they were persistent.
 * Receives as parameter an actor, an optional quantity of messages to recover,
 * if this quantity is not specified the default value from the channel will be
 * tried and if not the default value of the command.
 */
var status = require('../codes.js').hResultStatus;
var validator = require('../validators.js');
var hFilter = require('../hFilter.js');
var dbPool = require('../dbPool.js').db;

var hGetLastMessages = function(){
    //Default max quantity of messages to be returned. This will be used
    //If a max quantity is not specified and if there is not a default value for the channel
    this.quant = 10;
};

/**
 * Method executed each time an hCommand with cmd = 'hGetLastMessages' is received.
 * Once the execution finishes we should call the callback.
 * @param hMessage - hMessage received with cmd = 'hGetLastMessages'
 * @param context - Models from the database to store/search data. See lib/mongo.js
 * @param cb(status, result) - function that receives arg:
 *    status: //Constant from var status to indicate the result of the hCommand
 *    result: [hMessage]
 */
hGetLastMessages.prototype.exec = function(hMessage, context, cb){
    var hCommand = hMessage.payload;
    var params = hCommand.params;
    var actor = hMessage.actor

    //Test for missing actor
    if( !actor )
        return cb(status.MISSING_ATTR, 'command missing actor');

    if(validator.isChannel(actor) === false)
        return cb(status.INVALID_ATTR, 'actor is not a channel');

    var sender = hMessage.publisher.replace(/\/.*/, '');
    var quant = this.quant;

    var db = dbPool.getDb('admin');
    var channel = db.cache.hChannels[actor];

    if(!channel)
        return cb(status.NOT_AVAILABLE, 'the channel does not exist');

    if(channel.subscribers.indexOf(sender) > -1 && channel.active == true){

        if(channel.headers)
            quant = params.nbLastMsg || channel.headers['MAX_MSG_RETRIEVAL'] || quant; //In case header mal format
        else
            quant = params.nbLastMsg || quant;

        quant = parseInt(quant);

        //Test if quant field by the user is a number
        quant = isNaN(quant) ? this.quant : quant;

        var hMessages = [];
        dbPool.getDb(validator.getDomainJID(actor), function(dbInstance){
            var stream = dbInstance.get(channel._id).find({}).sort({published:-1}).skip(0).stream();

            stream.on("data", function(localhMessage) {
                hMessages.actor = localhMessage._id;
                delete localhMessage._id;

                if(localhMessage && hFilter.checkFilterValidity(localhMessage, context.hClient.filter).result){
                    hMessages.push(localhMessage);
                    if(--quant == 0)
                        stream.destroy();
                }

            });

            stream.on('close', function(){
                cb(status.OK, hMessages);
            });
        });


    }else{
        cb(status.NOT_AUTHORIZED, 'not authorized to retrieve messages from "'+ actor);
    }

};

exports.Command = hGetLastMessages;