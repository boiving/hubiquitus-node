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
var hAdmin = require('../hAdmin.js').getHAdmin();
var xmlElement = require('../server_connectors/xmpp_connection.js').Element;
var validators = require('../validators.js');
var dbPool = require('../dbPool.js').db;


var hSubscribe = function(){
};

/**
 * Subscribes a publisher to a channel
 * @param hMessage - hMessage with hCommand received with cmd = 'hSubscribe'
 * @param context - Auxiliary functions,attrs from the controller.
 * @param cb(status, result) - function that receives args:
 *    status: //Constant from var status to indicate the result of the hCommand
 *    result: undefined if ok.
 */
hSubscribe.prototype.exec = function(hMessage, context, cb){
    var self = this;
    var statusValue = null, result = null;

    var hCommand = hMessage.payload;

    var actor = hMessage.actor;

    if(!actor)
        return cb(status.MISSING_ATTR, 'missing actor');

    if(!validators.isChannel(actor))
        return cb(status.INVALID_ATTR, 'actor is not a channel');

    var channel;
    dbPool.getDb('admin', function(dbInstance){
        var stream = dbInstance.get('hChannels').find({_id: hMessage.actor}).streamRecords();

        stream.on("data", function(hChannel) {
            channel = hChannel;
        });
        stream.on("end", function(){
            if(channel){
                //Convert sender to bare jid
                var jid = hMessage.publisher.replace(/\/.*/, '');

                if(channel.active == false){
                    statusValue = status.NOT_AUTHORIZED;
                    result = 'the channel is inactive';
                }

                //Check if in subscribers list
                else if(channel.subscribers.indexOf(jid) > -1)
                    self.subscribePublisher(actor, jid, cb);
                else{
                    statusValue = status.NOT_AUTHORIZED;
                    result = 'not allowed to subscribe to "' + actor + '"';
                }

            } else{
                statusValue = status.NOT_AVAILABLE;
                result = 'channel "' + actor + '" not found';
            }

            if(statusValue)
                cb(statusValue, result);
        });
    });
};

/**
 * Checks if the user is not already subscribed and subscribes him.
 * @param actor - Channel to subscribe to
 * @param jid - BARE JID of the publisher
 * @param cb(status, result) - function that receives args:
 *    status: //Constant from var status to indicate the result of the hCommand
 *    result: undefined if ok.
 */
hSubscribe.prototype.subscribePublisher = function(actor, jid, cb){

    var self = this;
    dbPool.getDb('admin', function(dbInstance){
        dbInstance.get('hSubscriptions').findOne({_id: jid}, function(err, doc){

            if(err)
                return cb(status.TECH_ERROR, JSON.stringify(err));

            if(doc && doc.subs.indexOf(actor) > -1)
                return cb(status.NOT_AUTHORIZED, 'already subscribed to channel ' + actor);

            dbInstance._updater(dbInstance.get('hSubscriptions'), {_id: jid}, {$push: {subs: actor}}, {upsert: true}, function(err, result){
                //Save completed. Send XMPP Subscription
                if(!err)
                    self.sendXMPPSubscription(actor, jid, cb);
                else
                    cb(err, result);
            });

        });
    })
};

/**
 * Method used to subscribe in XMPP the publisher
 * This method must be called once the validation of the parameters has been made.
 * @param actor - Name of the channel to subscribe to
 * @param jid - publisher to subscribe
 * @param cb - that receives (status, result).
 */
hSubscribe.prototype.sendXMPPSubscription = function(actor, jid, cb){
    var attrs = {
        type: 'set',
        to: 'pubsub.' + hAdmin.serverDomain
    };

    var content = new xmlElement('pubsub', {xmlns: 'http://jabber.org/protocol/pubsub#owner'})
        .c('subscriptions', {node: actor})
        .c('subscription', {jid: jid, subscription: 'subscribed'});


    hAdmin.sendIQ(attrs, content, function(stanza){
        cb(status.OK);
    });
};

exports.Command = hSubscribe;