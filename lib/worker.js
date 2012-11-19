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

/**
 * This simple worker implementation will wait a single message from its parent
 * with the module that should execute and its args as an object. The module must have
 * a exports.run = function(args). Before starting the module will initialize all the singletons
 * of the server. As of now, the server XMPP Connection and the DB connection.
 * Expected message:
 * {
 * module : string
 * args : {
 *     _mongoURI: <Mongo Address>,
 *     _xmppConnection: {<xmppConnectionParams>} (If not specified, the connection will not be started)
 * }
 * }
 */
var log = require('winston');
var validator = require('./validators.js');

var workerLauncher = function(msg) {
    if(msg && msg.module){
       var module = require(msg.module);
        if(typeof module.run === 'function'){

            var db = require('./dbPool.js').db.getDb("admin");

            //Before launching the module load the database and xmpp connection.
            db.once('connect', function(){
                if(msg.args._xmppConnection){
                    var xmppConnection = require('./hAdmin.js');
                    xmppConnection = xmppConnection.getHAdmin(msg.args._cmdController);
                    xmppConnection.once('connect', function(){
                        process.removeListener('message', workerLauncher);
                        module.run(msg.args);
                    });

                    xmppConnection.connect(msg.args._xmppConnection);
                }else{
                    process.removeListener('message', workerLauncher);
                    module.run(msg.args);
                }
            });
            db.connect(msg.args._mongoURI);
        }

        process.addListener("uncaughtException", function (err) {
            log.error("Uncaught exception: " + err);
        });

        //reorder levels so debug print everything
        log.setLevels(log.config.syslog.levels);

        //Don't crash on uncaught exception
        log.exitOnError = false;

        if(msg.args.logFile && msg.args.logFile.length > 0)
            log.add(log.transports.File, { filename: msg.args.logFile, handleExceptions: true, level: msg.args.logLevel});

        log.remove(log.transports.Console);
        log.add(log.transports.Console, {handleExceptions: true, level: msg.args.logLevel});
    }
};
process.on('message', workerLauncher);