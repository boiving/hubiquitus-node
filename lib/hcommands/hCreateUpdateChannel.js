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
var unsubscriberModule = require('./hUnsubscribe.js').Command;
var validators = require('../validators.js');
var hFilter = require('../hFilter.js');
var dbPool = require('../dbPool.js').db;


var hCreateUpdateChannel = function(){
};

/**
 * Method executed each time an hCommand with cmd = 'hCreateUpdateChannel' is received.
 * Once the execution finishes cb is called.
 * @param hCommand - hCommand received with cmd = 'hCreateUpdateChannel'
 * @param context - Auxiliary functions,attrs from the controller.
 * @param cb(status, result) - function that receives args:
 *    status: //Constant from var status to indicate the result of the hCommand
 *    result: //An optional result object defined by the hCommand
 */
hCreateUpdateChannel.prototype.exec = function(hMessage, context, cb){
    var self = this;
    var hCommand = hMessage.payload;
    var channel = hCommand.params;

    if( !channel || typeof channel !== 'object')
        return cb(status.INVALID_ATTR, 'invalid params object received');

    //Test owner against publisher (ignore resources)
    if( channel.owner && !validators.compareJIDs(hMessage.publisher, channel.owner) )
        return cb(status.NOT_AUTHORIZED, 'owner does not match sender');

    if( channel.actor === undefined)
        return cb(status.MISSING_ATTR, 'Missing actor in params');

    if( channel.actor === "" || typeof channel.actor !== "string")
        return cb(status.INVALID_ATTR, 'actor must be a string');

    //Test if valid name and if valid domain
    /*if( !(new RegExp('(^[^@]*$|@' + validators.getDomainJID(hMessage.publisher) + '$)').test(channel.actor)) )
        return cb(status.INVALID_ATTR, 'trying to use a different domain than current'); */

    channel.filter = channel.filter || {};
    var checkFormat = hFilter.checkFilterFormat(channel.filter);
    if(checkFormat.result === false)
        return cb(status.INVALID_ATTR, checkFormat.error);

    var dbCache = dbPool.getDb('admin');

    var existingChannel = dbCache.cache.hChannels[channel.actor];
    if(existingChannel){ //Updated
        dbCache.cache.hChannels[channel.actor] = channel;
    }
    //Verify if trying to change owner
    if(existingChannel && !existingChannel.owner.match(channel.owner))
        return cb(status.NOT_AUTHORIZED, 'trying to change owner');

    //If subscribers were removed, unsubscribe them
    var unsubscriber = new unsubscriberModule();

    //copy message for unsubscribe
    var unsubscribeMsg = {};
    Object.getOwnPropertyNames(hMessage).forEach(function (name) {
        unsubscribeMsg[name] = hMessage[name];
    });
    unsubscribeMsg.type = "hCommand";
    unsubscribeMsg.payload = {};
    if(existingChannel)
        for(var i = 0; i < existingChannel.subscribers.length; i++)
            if(channel['subscribers'].indexOf(existingChannel.subscribers[i]) < 0) {
                unsubscribeMsg.publisher = existingChannel.subscribers[i];
                unsubscribeMsg.payload.params = {actor: channel.actor};
                unsubscriber.exec(unsubscribeMsg, context, function(status, result){});
            }

    //Set received channel as our _id
    channel._id = channel.actor;
    delete channel.actor;

    //Remove empty headers and location
    validators.cleanEmptyAttrs(channel, ['headers', 'location', 'chdesc']);

    var useValidators;

    //If error with one of the getBareJID, ignore it, just use validation and we will get correct error
    try{
        useValidators = validators.getBareJID(hMessage.publisher) != validators.getBareJID(hAdmin.jid);
    } catch(err){
        useValidators = true;
    }

    dbPool.getDb('admin', function(dbInstance){
        dbInstance.saveHChannel(channel, useValidators, function(err, result){
            if(!err){
                if(existingChannel) //Updated
                    cb(status.OK);
                else{
                    self.createXMPPChannel(result._id, cb);
                }

            } else
                cb(err, result);
        });
    });
};

/**
 * Method used to create a XMPP Channel using options from the hCommand.
 * This method must be called once the validation of the parameters has been made.
 * It will call configureXMPPChannel to configure the channel after creation
 * @param actor - Name of the channel to create in the XMPP Server
 * @param cb - function() when finishes.
 */
hCreateUpdateChannel.prototype.createXMPPChannel = function(actor, cb){
    var self = this;
    var attrs = {
        type: 'set',
        to: 'pubsub.' + hAdmin.serverDomain
    };
    var content = new xmlElement('pubsub', {xmlns: 'http://jabber.org/protocol/pubsub'})
        .c('create', {node : actor});
    hAdmin.sendIQ(attrs, content, function(stanza){
        self.configureXMPPChannel(actor, cb);
    });

};

/**
 * Configures a XMPP Channel with the correct parameters to use it with hNode
 * @param actor - Channel identifier
 * @param cb - function() when finishes
 */
hCreateUpdateChannel.prototype.configureXMPPChannel = function(actor, cb){
    var attrs = {
        type: 'set',
        to: 'pubsub.' + hAdmin.serverDomain
    };

    var content = new xmlElement('pubsub', {xmlns: 'http://jabber.org/protocol/pubsub#owner'})

        //Configuration header
        .c('configure', {node: actor})
        .c('x', {xmlns: 'jabber:x:data', type: 'submit'})
        .c('field', {'var': 'FORM_TYPE', type: 'hidden'})
        .c('value').t('http://jabber.org/protocol/pubsub#node_config').up()

        //Node configuration
        .up().c('field', {'var': 'pubsub#persist_items'}).c('value').t(0).up()
        .up().c('field', {'var': 'pubsub#send_last_published_item'}).c('value').t('never').up()
        .up().c('field', {'var': 'pubsub#presence_based_delivery'}).c('value').t('false').up()
        .up().c('field', {'var': 'pubsub#notify_config'}).c('value').t(0).up()
        .up().c('field', {'var': 'pubsub#notify_delete'}).c('value').t(0).up()
        .up().c('field', {'var': 'pubsub#notify_retract'}).c('value').t(0).up()
        .up().c('field', {'var': 'pubsub#notify_sub'}).c('value').t(0).up()
        .up().c('field', {'var': 'pubsub#max_payload_size'}).c('value').t(50000).up();

    hAdmin.sendIQ(attrs, content, function(stanza){
        cb(status.OK);
    });
};

exports.Command = hCreateUpdateChannel;