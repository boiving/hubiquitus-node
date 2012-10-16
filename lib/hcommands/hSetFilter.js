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

var status = require('../codes.js').hResultStatus;
var db = require('../mongo.js').db;
var validator = require('../validators.js');
var hFilter = require('../hFilter.js');

var hSetFilter = function(){
};

/**
 * Method executed each time an hCommand with cmd = 'hSetFilter' is received.
 * Once the execution finishes we should call the callback.
 * @param hCommand - hCommand received with cmd = 'hSetFilter'
 * @param context - Auxiliary functions,attrs from the controller.
 * @param cb(status, result) - function that receives arg:
 *    status: //Constant from var status to indicate the result of the hCommand
 */
hSetFilter.prototype.exec = function(hMessage, context, cb){
    var hCommand = hMessage.payload;
    var cmd = hCommand.params;

    if( !cmd || !(cmd instanceof Object) )
        return cb(status.INVALID_ATTR, 'invalid params for the command');

    var checkFormat = hFilter.checkFilterFormat(cmd);
    if(checkFormat.result === true){

        if( !context.hClient.filter){
            context.hClient.filter = {};
        }

        context.hClient.filter = cmd;

        cb(status.OK);
    }
    else
        cb(status.INVALID_ATTR, checkFormat.error);
};




exports.Command = hSetFilter;