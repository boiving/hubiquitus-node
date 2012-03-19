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

var xmpp = require('./xmpp_connector.js');
var errors = require('./codes.js').errors;
var status = require('./codes.js').statuses;
var clients = {};
var options;


/**
 * Function to be used to start the connector. Default parameters can be found in options.js
 * @param options overrided options in JSON format. Look at options.js to see possibilities.
 */
exports.startSocketIOConnector = function(opts){
    options = opts;
    var io = require('socket.io').listen(opts['socket.io.port']); //Creates the HTTP server

    var logLevels = { DEBUG: 3, INFO: 2, WARN: 1, ERROR: 0 };
    io.set('log level', logLevels[opts['global.loglevel']]);
    log.setLevel(opts['global.loglevel']);

    var channel = io
        .of(opts['socket.io.namespace'])
        .on('connection', function (socket) {
            var id = socket.id;
            clients[id] = {
                id : id,
                rid: Math.floor(Math.random()*100000001),
                socket : socket
            };
            socket.on('connect', function(data){ connect(clients[id], data); });
            socket.on('attach', function(data){ attach(clients[id], data); });
            socket.on('disconnect', function(){ disconnect(clients[id]); });
        });
};

/**
 * @param client - Reference to the client
 * @param data - Expected {jid, password, (host), (port)}
 */
function connect(client, data){
    log.info("Client ID " + client.id +  " sent data: " + JSON.stringify(data));

    client.xmppConnector = new xmpp.XMPPConnector(data);

    //Relay all server status messages
    client.xmppConnector.on('link', function(msg){
        client.socket.emit('link', msg);
    });

    client.xmppConnector.on('connection', function(attrs){
        //Store our userid and send attrs to client
        client.userid = attrs.userid;
        client.socket.emit('attrs', {
            userid: attrs.userid,
            rid: client.rid,
            sid: client.id});

        //Start listening for client actions
        addSocketListeners(client);

        //Start listening for messages from XMPP and relaying them
        client.xmppConnector.on('message', function(msg){
            log.info("Sent message to client " + client.id + " : " + JSON.stringify(msg));
            client.socket.emit('message', {channel: msg.channel, message: msg.message});
            client.rid++;
        });

        client.xmppConnector.on('result', function(msg){
            log.info("Sent result to client " + client.id + " : " + JSON.stringify(msg));
            client.socket.emit('result', {type: msg.type, channel: msg.channel, msgid: msg.msgid});
            client.rid++;
        });

        client.xmppConnector.on('error', function(msg){
            log.info("Sent error to client " + client.id + " : " + JSON.stringify(msg));
            client.socket.emit('error', {type: msg.type, code: msg.code, channel: msg.channel, id: msg.msgid});
            client.rid++;
        });
    });

    //Connect to XMPP Server
    client.xmppConnector.establishConnection();

    //Login to XMPP Server
    client.xmppConnector.connect();
}

function addSocketListeners(client){
    client.socket.on('subscribe', function(data){
        log.info('Client ID ' + client.id  + ' sent data: ' + JSON.stringify(data));
        client.xmppConnector.subscribe(data);
    });

    client.socket.on('unsubscribe', function(data){
        log.info('Client ID ' + client.id  + ' sent data: ' + JSON.stringify(data));
        client.xmppConnector.unsubscribe(data);
    });

    client.socket.on('publish', function(data) {
        log.info('Client ID ' + client.id  + ' sent data: ' + JSON.stringify(data));
        client.xmppConnector.publish(data);
    });
}

/**
 *
 * @param client - Reference to the client
 * @param data - expected {sid, rid, userid}
 */
function attach(client, data){
    /*
     To do an attach, we first confirm if the client is well authenticated,
     then we need to change the reference in the old client and delete it.
     */

    /*Check authentication
     Authentication consists of veryfing
     1. if the SID given is valid (corresponds to an active user)
     2. if the RID is in a valid RID window
     3. if the userid corresponds to that of the identified client
     */
    client.socket.emit('link', {status: status.Attaching});
    var ridWindow = options['socket.io.disctimeout'];
    var supposedClient = clients[data.sid];

    if( supposedClient &&
        data.rid <= supposedClient.rid + ridWindow&&
        data.rid >= supposedClient.rid - ridWindow &&
        data.userid === supposedClient.userid
        ){
        //Attached successfully
        clearTimeout(supposedClient.discTimeout);
        supposedClient.socket.emit('disconnect');

        supposedClient.socket = client.socket;
        addSocketListeners(supposedClient);
        supposedClient.socket.emit('link', {status: status.Attached});

        delete clients[client.id];
        delete supposedClient.discTimeout;
        log.info('Client ID ' + supposedClient.id  + ' has attached');
    }
    else{
        //Wrong authentication, send error
        log.info('Client ID ' + client.id  + ' tried to attach but failed');
        client.socket.emit('link', {status: status.Error, code: errors.FAILED_ATTACH});
    }
}

function disconnect(client){
    var timeout = options['socket.io.disctimeout'];

    if (client && client.xmppConnector){
        log.info('Activating timeout for Client ' + client.id);
        client.discTimeout = setTimeout(function(){
            log.info('Disconnecting Client ' + client.id)
            client.xmppConnector.disconnect();
            delete clients[client.id];
        }, timeout);
    } else{
        if(client) delete clients[client.id];
    }
}