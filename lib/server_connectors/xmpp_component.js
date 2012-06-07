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

var xmpp = require('node-xmpp');
//Events
var util = require('util');
var events = require('events').EventEmitter;

var errors = require('../codes.js').errors;
var status = require('../codes.js').statuses;

/**
 * Constructor for a xmpp connector
 */
var Component = function(){
    events.call(this);
    this.status = status.DISCONNECTED;
};

util.inherits(Component, events);

/**
 * Connects to the XMPP Server and adds the listeners
 * for all the events
 * @param opts an object:
 * {
 * jid: <string>,
 * password: <string>,
 * host: <string>,
 * port: <int>
 * }
 */
Component.prototype.connect = function(opts){
    this.setMaxListeners(50); //Useful for tests because it's a singleton
    this.opts = opts;
    this.jid = opts.jid;
    this.cmp = new xmpp.Component(this.opts);
    this.addConnectionListeners();
};

/**
 * Disconnects from the XMPP Server and emits a message to let the user know
 */
Component.prototype.disconnect = function(){
    var self = this;
    if(this.cmp && this.status == status.CONNECTED){
        this.cmp.on('close', function(){ self.emit('disconnected') });
        this.cmp.end();
    }else {
        this.emit('error', {
            code: errors.NOT_CONNECTED,
            msg: 'trying to disconnect, but not connected'
        });
    }
};

/**
 * Sets all the listeners for events from XMPP
 */
Component.prototype.addConnectionListeners = function(){
    var self = this;

    //When connected emit a message
    this.cmp.on('online', function(){
        self.status = status.CONNECTED;
        self.emit('connected');
    });

    //When a stanza is received treat it
    this.cmp.on('stanza', function(stanza){
        log.debug('Component Received Stanza:', stanza);
        var hContent = stanza.getChild('hbody');

        if( stanza.is('message') &&
            stanza.attrs.type !== 'error' &&
            hContent){

            //hCommand
            if(/^hcommand$/i.test(hContent.attrs.type)){
                try{
                    var objReceived = hContent.getText().replace(/&quot;/g,'"'); //Solves problem with Strophe
                    var hCommand = JSON.parse(objReceived);

                    if(!hCommand) throw 'null object';

                    self.emit('hCommand',
                        {hCommand: hCommand, from: stanza.attrs.from});

                }catch(err){
                    //Error parsing the hCommand. Ignore it
                    log.warn('Received an invalid hCommand from', stanza.attrs.from, err);
                }
            }
        }

        //Let everyone listen to the raw stanza
        self.emit('stanza', stanza);
    });

    //When a result is available add XMPP Headers and send it
    this.on('hResult', function(res){
        var msg = new xmpp.Element('message', {from: self.jid,
            to: res.args.to}).c('hbody', {type: 'hresult'}).t(JSON.stringify(res.hResult));
        log.debug('Component Sent Stanza:', msg);

        self.cmp.send(msg);
    });

    //Listen for errors and hNodify them
    this.cmp.on('error', function(error){
        if(error.code == 'ENOTFOUND')
            self.emit('error', {
                code: errors.TECH_ERROR,
                msg: 'invalid domain'
            });
        else if(error.getChild && error.getChild('not-authorized'))
            self.emit('error', {
                code: errors.AUTH_FAILED,
                msg: 'can not connect with given secret'
            });
        else
            self.emit('error', {
                code: errors.TECH_ERROR,
                msg: 'unknown error'
            })
    });
};

Component.prototype.send = function(msg){
    this.cmp.send(msg);
};

exports.componentConnection = new Component();