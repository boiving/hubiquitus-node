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
 * Subscribes a publisher to a channel
 */
var status = require('../codes.js').hResultStatus;
var xmpp = require('node-xmpp');

//Events
var util = require('util');
var events = require('events').EventEmitter;

var hSubscribe = function(){
    events.call(this);
};
util.inherits(hSubscribe, events);

/**
 * Method executed each time an hCommand with cmd = 'hSubscribe' is received.
 * Once the execution finishes we should emit a result.
 * @param hCommand - hCommand received with cmd = 'hSubscribe'
 * @param context - Models from the database to store/search data. See lib/mongo.js
 * @emit result - {
 *    hCommand: hCommand //hCommand received
 *    status: //Constant from var status to indicate the result of the hCommand
 *    result: //An optional result object defined by the hCommand
 * };
 */
hSubscribe.prototype.exec = function(hCommand, context){
    var self = this;
    var statusValue, result;

    if( !hCommand.params || typeof hCommand.params !== 'object' || !hCommand.params.chid ){
        this.emit('result', {hCommand: hCommand, status: status.MISSING_ATTR,
            result: 'missing chid'});
        return;
    }

    var channel = hCommand.params.chid;

    context.models.hChannel.findOne({chid: channel, active: true}, function(err, doc){
        if(!err){
            if(doc){

                //Convert sender to bare jid
                var jid = hCommand.sender.replace(/\/.*/, '');

                //Check if in participants list
                var i = 0;
                while(i < doc.participants.length && doc.participants[i] != jid) i++;

                if(doc.participants[i]){
                    self.subscribePublisher(channel, jid, context, hCommand);
                    return;

                } else{
                    statusValue = status.NOT_AUTHORIZED;
                    result = 'not allowed to subscribe';
                }

            } else{
                statusValue = status.NOT_AVAILABLE;
                result = 'channel not found';
            }

        } else{
            //Mongo Error
            statusValue = status.TECH_ERROR;
            result = JSON.stringify(err);
        }

        log.info('Error subscribing to channel, Status:', statusValue, 'Result:', result);
        self.emit('result', {hCommand: hCommand, status: statusValue, result: result});
    });
};

/**
 * Checks if the user is not already subscribed and subscribes him.
 * @param chid - Channel to subscribe to
 * @param jid - BARE JID of the publisher
 * @param context - Context from the controller
 * @param hCommand - received hCommand
 */
hSubscribe.prototype.subscribePublisher = function(chid, jid, context, hCommand){
    var self = this;
    context.models.subscription.findOne({jid: jid}, function(err, doc){

        if(err){
            self.emit('result', {hCommand: hCommand, status: status.TECH_ERROR,
                result: JSON.stringify(err)});
            return;
        }

        if(doc){
            for(var i = 0; i < doc.subs.length; i++)
                if( doc.subs[i] == chid ){
                    self.emit('result', {hCommand: hCommand, status: status.NOT_AUTHORIZED,
                        result: 'already subscribed'});
                    return;
                }
        }

        //All good to go
        var instance = doc || new context.models.subscription();
        instance.jid = instance.jid || jid;

        if(instance.subs)
            instance.subs.push(chid);
        else
            instance.subs = [chid];

        instance.save(function(err){
            if(!err){
                //Save completed. Send XMPP Subscription
                self.sendXMPPSubscription(chid, jid, context, function(err){
                    log.info('Success subscribing to channel ' + chid + ' by ' + jid);
                    self.emit('result', {hCommand: hCommand, status: status.OK});
                });

            }else{
                var statusValue = status.TECH_ERROR;
                var result = JSON.stringify(err);
                log.info('Error subscribing to channel, Status:', statusValue, 'Result:', result);
                self.emit('result', {hCommand: hCommand, status: statusValue, result: result});
            }

        });

    });
};

/**
 * Method used to subscribe in XMPP the publisher
 * This method must be called once the validation of the parameters has been made.
 * @param chid - Name of the channel to subscribe to
 * @param jid - publisher to subscribe
 * @param context - Context received from the controller
 * @param cb - receives error or nothing.
 */
hSubscribe.prototype.sendXMPPSubscription = function(chid, jid, context, cb){
    var self = this;
    var msgId = Math.floor(Math.random()*100000000000000001);

    var msg = new xmpp.Element('iq', {
        type: 'set',
        from: context.jid,

        //Because our jid is well formatted there is no risk doing this
        to: 'pubsub.' + context.jid.replace(/\w+\./,''),
        id: msgId
    });

    msg.c('pubsub', {xmlns: 'http://jabber.org/protocol/pubsub#owner'})
        .c('subscriptions', {node: chid})
        .c('subscription', {jid: jid, subscription: 'subscribed'});


    this.on('stanza', function(stanza){
        if(stanza.attrs.id == msgId){
            self.removeAllListeners('stanza');
            cb();
        }
    });

    this.emit('send', msg);
};

/**
 * Create an instance of hSubscribe and expose it
 */
var hCommand = new hSubscribe();
exports.Command = hCommand;