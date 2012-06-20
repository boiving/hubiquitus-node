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

var log = require('winston');

var status = require('../codes.js').hResultStatus;
var xmlElement = require('node-xmpp').Element;
var db = require('../mongo.js').db;
var xmppConnection = require('../server_connectors/xmpp_hnode.js').ServerConnection;

var hUnsubscribe = function(){
};

/**
 * Unsubscribes a publisher from a channel.
 * @param hCommand - hCommand received with cmd = 'hUnsubscribe'
 * @param context - Auxiliary functions,attrs from the controller/ db models.
 * @param cb(status, result) - function that receives args:
 *    status: //Constant from var status to indicate the result of the hCommand
 *    result: undefined if ok.
 */
hUnsubscribe.prototype.exec = function(hCommand, context, cb){
    var self = this;

    if( !hCommand.params )
        return cb(status.MISSING_ATTR, 'missing params object');

    var chid = hCommand.params.chid;

    if( !chid )
        return cb(status.MISSING_ATTR, 'missing chid');

    var channel = db.cache.hChannels[chid];

    if( !channel )
        return cb(status.NOT_AUTHORIZED, 'chid does not exist');

    if(channel.active == false)
        return cb(status.NOT_AUTHORIZED, 'inactive channel');

    //Removing resource
    var user = hCommand.sender.replace(/\/.*/,'');
    db.get('hSubscriptions').findOne({_id: user }, function(err, doc){
        if(!err) {
            if(doc && doc.subs.indexOf(chid) > -1) {

                //Unsubscribe...
                doc.subs.splice(doc.subs.indexOf(channel), 1);

                db._saver(db.get('hSubscriptions'), doc, function(err, result){
                    if(!err){
                        self.XMPPUnsubscribe(channel, user, function(err){
                            return cb(status.OK);
                        });
                    } else
                        return cb(status.TECH_ERROR, JSON.stringify(err));
                });
            } else
            //Doesn't exist in collection or not found in array, so it does not have subscriptions
                return cb(status.NOT_AUTHORIZED, 'user not subscribed to channel');

        }else
            return cb(status.TECH_ERROR, JSON.stringify(err));
    });
};

/**
 * Unsubscribes the user from the XMPP Node.
 * @param chid - Channel to unsubscribe from
 * @param jid - JID of the user to unsubscribe
 * @param cb - Executed when finished, receives err or nothing
 */
hUnsubscribe.prototype.XMPPUnsubscribe = function(chid, jid, cb){

    var attrs = {
        type: 'set',
        to: 'pubsub.' + xmppConnection.domain
    };

    var content = new xmlElement('pubsub', {xmlns: 'http://jabber.org/protocol/pubsub#owner'})
        .c('subscriptions', {node: chid})
        .c('subscription', {jid: jid, subscription: 'none'});

    xmppConnection.sendIQ(attrs, content, function(stanza){
        cb();
    });
};

exports.Command = hUnsubscribe;