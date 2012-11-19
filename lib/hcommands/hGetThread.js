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

var status = require('../codes.js').hResultStatus;
var validator = require('../validators.js');
var hFilter = require('../hFilter.js');
var dbPool = require('../dbPool.js').db;

var hGetThread = function(){
};

/**
 * Method executed each time an hCommand with cmd = 'hGetThread' is received.
 * Once the execution finishes we should call the callback.
 * @param hMessage - hMessage received with hCommand with cmd = 'hGetThread'
 * @param context - Auxiliary functions,attrs from the controller.
 * @param cb(status, result) - function that receives arg:
 *    status: //Constant from var status to indicate the result of the hCommand
 *    result: //An [] of hMessages
 */
hGetThread.prototype.exec = function(hMessage, context, cb){

    this.checkValidity(hMessage, context, function(err, result){
        if(!err){
            var hCommand = hMessage.payload;
            var hMessages = [];
            var actor = hMessage.actor;
            var convid = hCommand.params.convid;
            var sort = hCommand.params.sort || 1;
            if(hCommand.params.sort !== -1 && hCommand.params.sort !== 1)
                sort = 1;

            dbPool.getDb(validator.getDomainJID(hMessage.actor), function(dbInstance){
                var stream = dbInstance.get(actor).find({convid: convid}).sort({published: sort}).skip(0).stream();

                var firstElement = true;

                stream.on("data", function(localhMessage) {
                    localhMessage.actor = actor;
                    localhMessage.msgid = localhMessage._id;
                    delete localhMessage._id;

                    if(firstElement && hFilter.checkFilterValidity(localhMessage, context.hClient.filter).result === false)
                        stream.destroy();

                    firstElement = false;

                    hMessages.push(localhMessage);
                });

                stream.on("close", function(){
                    cb(status.OK, hMessages);
                });
            })
        } else
            return cb(err, result);
    });
};

hGetThread.prototype.checkValidity = function(hMessage, context, cb){
    var hCommand = hMessage.payload;
    if(!hCommand.params || !(hCommand.params instanceof Object) )
        return cb(status.INVALID_ATTR, 'invalid params object received');

    var actor = hMessage.actor;
    var convid = hCommand.params.convid;

    if(!actor)
        return cb(status.MISSING_ATTR, 'missing actor');

    if(!convid)
        return cb(status.MISSING_ATTR, 'missing convid');

    if(!validator.isChannel(actor))
        return cb(status.INVALID_ATTR, 'actor is not a channel');

    if(typeof convid != 'string')
        return cb(status.INVALID_ATTR, 'convid is not a string');

    var db = dbPool.getDb('admin');
    var hChannel = db.cache.hChannels[actor];

    if(!hChannel)
        return cb(status.NOT_AVAILABLE, 'the channel ' + actor + ' does not exist');

    if(!hChannel.active)
        return cb(status.NOT_AUTHORIZED, 'the channel ' + actor + 'is inactive');

    if(hChannel.subscribers.indexOf(validator.getBareJID(hMessage.publisher)) < 0)
        return cb(status.NOT_AUTHORIZED, 'the sender is not in the channel subscribers list');

    cb();
};

exports.Command = hGetThread;