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

//Events
var util = require('util');
var events = require('events').EventEmitter;

var xmpp = require('node-xmpp');
var xmppParser = require('./xmpp_parser.js').parser;
var errors = require('../codes.js').errors;
var statuses = require('../codes.js').statuses;


/**
 * @param params
 * { (String) publisher: bare JID (format: "user@domain")
 *   (String) password: User's XMPP password
 *   (Optional) (String) serverHost: XMPP host
 *   (Optional) (String) serverPort : XMPP port to connect to  }
 */
var XMPPConnector = function(params){
    events.call(this);
    this.parameters = params;
    this.parameters.jid = params.publisher;
    this.parameters.host = params.serverHost;
    this.parameters.port = params.serverPort;
};

util.inherits(XMPPConnector, events);

XMPPConnector.prototype.establishConnection = function(){
    var self = this;
    this.client = new xmpp.Client(this.parameters);
    log.info('Connecting to XMPP Server');
    this.onIQs(); //Listens for IQ messages
    this.client.on('error', function(msg){
        if( msg == 'XMPP authentication failure' )
            self.emit('hStatus', {status: statuses.DISCONNECTED, errorCode: errors.AUTH_FAILED});
    });
};

/**
 * Connects to the xmpp server and starts listening for subscribed events
 */
XMPPConnector.prototype.connect = function(){
    //Send Presence
    var self = this;
    this.client.on('online',
        function() {
            //Recover our complete JID as given by the server
            self.parameters.jid = this.jid.user + '@' + this.jid.domain + '/' + this.jid.resource;
            self.parameters.domain = this.jid.domain;
            // According to http://xmpp.org/rfcs/rfc3922.html
            this.send(new xmpp.Element('presence'));
            self.emit('hStatus', {status: statuses.CONNECTED, errorCode: errors.NO_ERROR});
            self.emit('connection', {publisher: self.parameters.jid, domain: self.parameters.domain});
            log.info("Presence Sent to server");
        });

    //Once new messages arrive, parse them and emit them
    this.client.on('stanza', function(stanza){
        log.debug('client ' + self.parameters.jid + ' received: ', stanza);
        var parsedMessage = xmppParser.parseMessageStanza(stanza);
        if(parsedMessage)
            self.emit('hMessage', parsedMessage);
        else{
            parsedMessage = xmppParser.parseHResult(stanza);
            if(parsedMessage)
                self.emit('hResult', parsedMessage);
        }
    });
};

/**
 * Disconnects the current client from the XMPP Server
 */
XMPPConnector.prototype.disconnect = function(){
    if(this.client.socket) //Check if we haven't already disconnected
        this.client.end();
    log.debug('Disconnected from XMPP Server');
};

/**
 * Process an hCommand sending it to the XMPP Server
 * @param hCommand
 */
XMPPConnector.prototype.hCommand = function(hCommand){
    try{
        var msg = new xmpp.Element('message', {to: hCommand.entity})
            .c('hbody', {type: 'hcommand'})
            .t(JSON.stringify(hCommand));
        this.client.send(msg);
        log.debug('Sent message to server:', msg);
    }catch(err){
        log.error('Client sent invalid hCommand, could not parse.', err);
    }
};

/**
 * IQ listener that tests open requests
 * All open requests are stored in openReqs and will be analyzed when an iq arrives to
 * see if the request has been answered. It also responds to the server with an error if
 * the IQ-Get message is not recognized.
 */
XMPPConnector.prototype.onIQs = function(){
    var self = this;
    this.client.on('stanza', function(stanza) {
        if(stanza.is('iq')){
            log.debug('Server sent IQ: ' + stanza);

            if (stanza.attrs.type === 'get'){
                //Get requests are not implemented. We sent them back as errors to the server.
                var msg = new xmpp.Element('iq', {type: 'error',
                    from: stanza.attrs.to,
                    to: stanza.attrs.from,
                    id: stanza.attrs.id});
                msg.c(stanza.children[0].getName(), {xmlns: stanza.children[0].getNS()});
                msg.c('error', { type: 'cancel'})
                    .c('service-unavailable', {xmlns: 'urn:ietf:params:xml:ns:xmpp-stanzas'});

                self.client.send(msg);
                log.debug('Sent message to server: ' + msg);
            }
        }
    });
};

exports.XMPPConnector = XMPPConnector;