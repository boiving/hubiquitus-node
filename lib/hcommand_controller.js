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
 * This Controller takes care of all hCommands. Loads the requested hCommand,
 * sets a timeout for it in case it hangs up and calls callback when finishes executing
 * (even if there was an error)
 *
 * The hCommands that can be processed should be in the folder specified
 * by the param modulePath in the constructor.
 */

var hResultStatus = require('./codes.js').hResultStatus;

var fs = require('fs');
var path = require('path');
var log = require('winston');
var validator = require('./validators.js');
var dbPool = require('./dbPool.js').db;


/**
 * Starts an hCommandController
 * @param params - {
 *     modulePath : <String> (Path to the modules directory)
 *     timeout : <int> (time to wait before sending a timeout hResult)
 * }
 */
var Controller = function(params){
    this.params = params;

    //Dummy context
    this.context = {
        hClient: {
            filter: {},
            buildResult : function(actor, ref, status, result) {
                var hmessage = {};
                hmessage.msgid = "DummyMsgId";
                hmessage.actor = actor;
                hmessage.convid = hmessage.msgid;
                hmessage.ref = ref;

                hmessage.type = 'hResult';

                hmessage.priority = 0;

                hmessage.publisher = "DummyJid";
                hmessage.published = new Date();

                var hresult = {};

                hresult.status = status;
                hresult.result = result;

                hmessage.payload = hresult;

                return hmessage;
            }
        }
    };
};

/**
 * Tries to load a module, returns undefined if couldn't find.
 * @param module - name of the module to load
 */
Controller.prototype.loadModule = function(module){
    var modulePath = this.params.modulePath;

    //Try to load Module ignoring case
    var fileNames = fs.readdirSync(modulePath);
    var regex = new RegExp(module, 'i');
    for(var i = 0; i < fileNames.length; i++)
        if(regex.test(fileNames[i])){
            var module = require(path.resolve(path.join(modulePath, fileNames[i]))).Command;
            return new module();
        }


    return null;
};

/**
 * Returns a hmessage with result payload with all the needed attributes
 * @param hMessage - the hMessage with the hCommand payload
 * @param status - the Status of the hResult
 * @param resObject - the optional object sent as a response
 */
Controller.prototype.createResult = function(hMessage, status, resObject){
    return this.context.hClient.buildResult(hMessage.publisher, hMessage.msgid, status, resObject);
};

/**
 * Loads the hCommand module, sets the listener calls cb with the hResult.
 * @param hMessage - The received hMessage with a hCommand payload
 * @param cb - Callback receiving a hResult (optional)
 */
Controller.prototype.execCommand = function(hMessage, cb){
    var db = require('./dbPool.js').db.getDb(validator.getDomainJID(hMessage.publisher));
    var self = this;
    var timerObject = null; //setTimeout timer variable
    var commandTimeout = null; //Time in ms to wait to launch timeout
    var hMessageResult;

    if(!hMessage) return;

    cb = cb || function(hMessage){};
    var hCommand = hMessage.payload;

    //check hCommand
    if (!hCommand || typeof hCommand !== 'object') {
        cb(self.createResult(hMessage, hResultStatus.INVALID_ATTR, "Invalid payload. Not an hCommand"));
        return;
    }

    if (!hCommand.cmd || typeof hCommand.cmd !== 'string') {
        cb(self.createResult(hMessage, hResultStatus.INVALID_ATTR, "Invalid command. Not a string"));
        return;
    }

    if (hCommand.params && typeof hCommand.params !== 'object') {
        cb(self.createResult(hMessage, hResultStatus.INVALID_ATTR, "Invalid command. Params is settled but not an object"));
        return;
    }

    var module = this.loadModule(hCommand.cmd + '.js');
    if(module){

        commandTimeout = module.timeout || this.params.timeout;

        var onResult = function(status, result){
            //If callback is called after the timer ignore it
            if(timerObject == null) return;

            clearTimeout(timerObject);

            hMessageResult = self.createResult(hMessage, status, result);

            //Save result
            if( hMessageResult.persistent === true ){
                hMessageResult._id = msgId;

                delete hMessageResult.persistent;
                delete hMessageResult.msgid;

                dbPool.getDb(validator.getDomainJID(hMessage.actor), function(dbInstance){
                    dbInstance.saveHMessage(hMessageResult);
                });

                hMessageResult.persistent = true;
                hMessageResult.msgid = hMessageResult._id;
                delete hMessageResult._id;
            }

            log.debug('hCommand Controller sent hMessage with hResult', hMessageResult);
            cb(hMessageResult);
        };

        //Add a timeout for the execution
        timerObject = setTimeout(function(){
            //Set it to null to test if cb is executed after timeout
            timerObject = null;

            hMessageResult = self.createResult(hMessage, hResultStatus.EXEC_TIMEOUT);

            log.warn('hCommand Controller sent hMessage with exceed timeout error', hMessageResult);
            cb(hMessageResult);

        }, commandTimeout);

        //Run it!
        try {
            module.exec(hMessage, this.context, onResult);
        }
        catch(err){
            clearTimeout(timerObject);
            log.error('Error in hCommand processing, hMessage = '+hMessage+' with error : '+err);
            return cb(this.context.hClient.buildResult(hMessage.publisher, hMessage.msgid, hResultStatus.TECH_ERROR, 'error processing message : '+err));
        }

    }else{
        //Module not found
        hMessageResult = self.createResult(hMessage, hResultStatus.NOT_AVAILABLE);

        //Save result
        if( hMessageResult.persistent === true ){
            hMessageResult._id = msgId;

            delete hMessageResult.persistent;
            delete hMessageResult.msgid;

            dbPool.getDb(validator.getDomainJID(hMessage.actor), function(dbInstance){
                dbInstance.saveHMessage(hMessageResult);
            });

            hMessageResult.persistent = true;
            hMessageResult.msgid = hMessageResult._id;
            delete hMessageResult._id;
        }

        log.warn('hCommand Controller sent hMessage with module not found error', hMessageResult);
        cb(hMessageResult);
    }
};

exports.Controller = Controller;