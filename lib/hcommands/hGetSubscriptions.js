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

var log = require('winston');

var status = require('../codes.js').hResultStatus;
var validator = require('../validators.js');
var dbPool = require('../dbPool.js').db;


var hGetSubscriptions = function(){
};

/**
 * Searches for subscriptions of <Sender> to channels that are currently active.
 *
 * @param hMessage - hMessage received with hCommand with cmd = 'hGetSubscriptions'
 * @param context - Auxiliary functions,attrs from the controller.
 * @param cb(status, result) - function that receives args:
 *    status: //Constant from var status to indicate the result of the hCommand
 *    result: <String[]>
 */
hGetSubscriptions.prototype.exec = function(hMessage, context, cb){
    var splitedJid = validator.splitJID(hMessage.publisher);
    var publisher = splitedJid[0] + "@" + splitedJid[1];
    var db = require('../dbPool.js').db.getDb(validator.getDomainJID(hMessage.publisher));

    dbPool.getDb('admin', function(dbInstance){
        dbInstance.get('hSubscriptions').findOne({_id: publisher}, function(err, doc){
            var subscriptions = [];
            if(!err){
                var subs = doc && doc.subs ? doc.subs : [];

                //Only return active channels
                for(var i = 0; i < subs.length; i++)
                    if(dbInstance.cache.hChannels[subs[i]] && dbInstance.cache.hChannels[subs[i]].active)
                        subscriptions.push(subs[i]);

                cb(status.OK, subscriptions);

            } else
                cb(status.TECH_ERROR, JSON.stringify(err));
        });
    });


};

exports.Command = hGetSubscriptions;