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

var hUnsubscribe = function(){
};

/**
 * Unsubscribes a publisher from a channel.
 * @param hMessage - hMessage with hCommand received with cmd = 'hUnsubscribe'
 * @param context - Auxiliary functions,attrs from the controller/ db models.
 * @param cb(status, result) - function that receives args:
 *    status: //Constant from var status to indicate the result of the hCommand
 *    result: undefined if ok.
 */
hUnsubscribe.prototype.exec = function(hMessage, context, cb){
    var self = this;

    var hCommand = hMessage.payload;

    var actor = hMessage.actor;

    if(!actor)
        return cb(status.MISSING_ATTR, 'missing actor');

    if(!validators.isChannel(actor))
        return cb(status.INVALID_ATTR, 'actor is not a channel');

    var db = dbPool.getDb('admin');
    var channel = db.cache.hChannels[actor];

    if( !channel )
        return cb(status.NOT_AVAILABLE, 'channel does not exist');

    if(channel.active == false)
        return cb(status.NOT_AUTHORIZED, 'inactive channel');

    //Removing resource
    var user = hMessage.publisher.replace(/\/.*/,'');
    dbPool.getDb('admin', function(dbInstance){
        dbInstance.get('hSubscriptions').findOne({_id: user, subs: actor}, function(err, doc){
            if(!err && doc)
                dbInstance._updater(dbInstance.get('hSubscriptions'), {_id: user}, {$pull: {subs: actor}}, function(err, result){
                    if(!err)
                        self.XMPPUnsubscribe(actor, user, cb);
                    else
                        return cb(err, result);
                });

            else if(!doc) //Doesn't exist in collection or not found in array, so it does not have subscriptions
                return cb(status.NOT_AUTHORIZED, 'user not subscribed to channel');

            else
                return cb(err, result);
        });
    });
};

/**
 * Unsubscribes the user from the XMPP Node.
 * @param actor - Channel to unsubscribe from
 * @param jid - JID of the user to unsubscribe
 * @param cb - Executed when finished, receives err or nothing
 */
hUnsubscribe.prototype.XMPPUnsubscribe = function(actor, jid, cb){

    var attrs = {
        type: 'set',
        to: 'pubsub.' + hAdmin.serverDomain
    };

    var content = new xmlElement('pubsub', {xmlns: 'http://jabber.org/protocol/pubsub#owner'})
        .c('subscriptions', {node: actor})
        .c('subscription', {jid: jid, subscription: 'none'});

    hAdmin.sendIQ(attrs, content, function(stanza){
        cb(status.OK);
    });
};

exports.Command = hUnsubscribe;