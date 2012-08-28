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
var hAdmin = require('../hAdmin.js').getHAdmin();
var xmlElement = require('../server_connectors/xmpp_connection.js').Element;var db = require('../mongo.js').db;
var validator = require('../validators.js');

var hPublish = function(){
};

/**
 * hPublish publishes a hMessage to a channel and, if selected, will store the message in Mongo.
 * Once the execution finishes cb is called.
 * @param hCommand - hCommand received with cmd = 'hPublish'
 * @param context - Auxiliary functions,attrs from the controller.
 * @param cb(status, result) - function that receives args:
 *    status: //Constant from var status to indicate the result of the hCommand
 *    result: undefined if ok.
 */
hPublish.prototype.exec = function(hCommand, context, cb){
    var self = this;
    var hMessage = hCommand.params;

    //For legacy purposes, if chid is a channel and does not contain # or @domain, include them
    if(hMessage && validator.isChannel(hMessage.chid))
        hMessage.chid = validator.normalizeChannel(hMessage.chid, validator.getDomainJID(hCommand.sender));

    validator.validateHMessage(hMessage, function(err, result){
        if(err)
            return cb(err, result);


        //Test sender against publisher (ignore the resource from both of them)
        if( !validator.compareJIDs(hCommand.sender, hMessage.publisher) )
            return cb(status.NOT_AUTHORIZED, 'publisher does not match sender');

        //Because chid can be that of another user, initialize to empty obj to use same completer methods
        var channel = db.cache.hChannels[hMessage.chid] || {};

        //Location order: hMessage, channel (as defined in ref.)
        hMessage.location = hMessage.location || channel.location;

        //Priority order: hMessage, channel, 1 (as defined in ref.)
        hMessage.priority = hMessage.priority || channel.priority || 1;

        //If hAlert force at least minimum priority
        if( /hAlert/i.test(hMessage.type) && hMessage.priority < 2 )
            hMessage.priority = 2;


        //Complete missing values (msgid added later)
        var msgId = db.createPk();
        hMessage.convid = !hMessage.convid || hMessage.convid == hMessage.msgid ? msgId : hMessage.convid;
        hMessage.published = hMessage.published || new Date();

        //Treat relevance
        var relevance = hMessage.relevance;
        if( hMessage.headers && hMessage.headers.RELEVANCE_OFFSET ){

            var offset = hMessage.published.getTime() + hMessage.headers.RELEVANCE_OFFSET;
            relevance = relevance ? Math.max(offset, hMessage.relevance.getTime()) : offset;

        }
        if(relevance)
            hMessage.relevance = new Date(relevance);


        //Empty location and headers should not be sent/saved.
        validator.cleanEmptyAttrs(hMessage, ['headers', 'location']);


        //If not transient store it (If it does not exist it is transient)
        if( hMessage.transient === false ){
            hMessage._id = msgId;

            delete hMessage.transient;
            delete hMessage.msgid;

            db.saveHMessage(hMessage);

            hMessage.transient = false;
            delete hMessage._id;
        }

        //Set the msgid AFTER saving because we use msgId as id for mongo
        hMessage.msgid = msgId;

        //Publish it to XMPP or send it directly
        if( validator.isChannel(hMessage.chid) )
            self.publishXMPP(hMessage, cb);
        else
            self.sendMsgXMPP(hMessage, context, cb);
    });
};

/**
 * Sends a hMessage using the user's account to another client. The message will be encoded using
 * the Hubiquitus-defined XML XMPP stanza.
 * @param hMessage - hMessage to send to hMessage.chid (when chid is not a channel but another client)
 * @param cb - cb(err) called when finished.
 */
hPublish.prototype.sendMsgXMPP = function(hMessage, context, cb){
    var msg = new xmlElement('message', {to: hMessage.chid})
        .c('hbody', {type: 'hmessage'})
        .t(JSON.stringify(hMessage));

    context.hClient.send(msg);

    cb(status.OK, hMessage);
};

hPublish.prototype.publishXMPP = function(hMessage, cb){
    //http://xmpp.org/extensions/xep-0060.html#publisher-publish
    var attrs = {
        type: 'set',
        to: 'pubsub.' + hAdmin.xmppdomain
    };

    var content = new xmlElement('pubsub', {xmlns: 'http://jabber.org/protocol/pubsub'})
        .c('publish', {node : hMessage.chid})
        .c('item')
        .c('entry', {xmlns: 'http://jabber.org/protocol/pubsub'}).t(JSON.stringify(hMessage));

    hAdmin.sendIQ(attrs, content, function(stanza){
        log.debug('hMessage published correctly', hMessage);
        cb(status.OK, hMessage);
    });

};

exports.Command = hPublish;