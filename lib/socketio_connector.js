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
var createOptions = require('./options.js').socketio_Options;

//For logging
var path = require('path');
var filename = "[" + path.basename(path.normalize(__filename)) + "]";
var log = require('log4js').getLogger(filename); //Use Case: log.info("Info to be logged");

/**
 * Function to be used to start the connector. Default parameters can be found in options.js
 * @param options overrided options in JSON format. Look at options.js to see possibilities.
 */
exports.startSocketIOConnector = function(opts){
    opts = opts || {};
    opts= createOptions(opts);

    var io = require('socket.io').listen(opts['socket.io.port']); //Creates the HTTP server
    io.set('log level', 2);
    var channel = io
      .of(opts['socket.io.namespace'])
      .on('connection', function (socket) {
            var clients = {};
            socket.on('connect', function(data){ connect.call(clients, data, channel); });
            socket.on('test', function(data){ disconnect.call(clients, data, channel);  });
            //Add other events: subscribe, unsubscribe, publish
    });
}

/**
 * @param client - Reference to the client that wishes to connect
 * @param data - Received data from the server
 * @param channel - Channel to send the data to
 */
function connect(data, channel){
    log.info("Received Data: " + data['jid'] + " " + data['password'] + " " +data['host'] + " " + data['port']);

    var random, id;

    do{
        random = Math.floor(Math.random()*100000000000000001);
        id = data['jid'] + '@' + random;
    } while(this.id);

    log.info("Client Using ID: " + id);

    this.id= new xmpp.XMPP(data);

    //The id will be sent to the client so that we can identify subsequent operations
    channel.emit('id', id);

    this.id.connect(function(message){
        channel.emit('connect', message);
        log.info("Sent to client: " + message);
    });
};

/**
* @param client - Reference to the client that will be disconnected
* @param data - Received data from the server (Optional)
* @param channel - Channel to send the data to (Optional)
*/
function disconnect(id, channel){
    log.info('ID Received: ' + id);
    if(this[id]){
        log.warn('Disconnecting Client');
        this[id].disconnect();
    }
    else
        log.warn("Trying to disconnect an inexistent connection");
};