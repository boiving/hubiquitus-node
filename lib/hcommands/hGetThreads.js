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
 * This command can be executed using two different algorithms:
 * 1. A 'linear' algorithm that is mono thread and a little faster if executed in a single environment without shards
 * 2. A 'mapReduce' algorithm that SHOULD be faster in a sharded environment.
 *
 * The default implementation is linear. to change set this.implementation to 'mapReduce' in hGetThreads constructor.
 */

var hResultStatus = require('../codes.js').hResultStatus;
var validator = require('../validators.js');
var dbPool = require('../dbPool.js').db;
var hFilter = require('../hFilter.js');

var hGetThreads = function(){
    this.implementation = 'linear';
};

/**
 * Method executed each time an hCommand with cmd = 'hGetThreads' is received.
 * Once the execution finishes we should call the callback.
 * @param hMessage - hMessage received with hCommand with cmd = 'hGetThreads'
 * @param context - Auxiliary functions,attrs from the controller.
 * @param cb(status, result) - function that receives arg:
 *    status: //Constant from var status to indicate the result of the hCommand
 *    result: //An [] of hMessages
 */
hGetThreads.prototype.exec = function(hMessage, context, cb){

    var self = this;
    this.checkValidity(hMessage, function(err, result){
        if(!err){
            var hCommand = hMessage.payload;
            /* EBR idée pour plus tard, rendre le choix de l'implémentation paramétrable lors de l'appel du service 
                je pense qu'à terme il faudra peut être trouver d'autres algorithmes 
                car dans le linéaire on doit parcourir la liste de tous les hConvState d'une collection...
                et dans le mapreduce j'ai l'impression que l'on parcourt tous les élements de la collection ... 
                A étudier : mettre à jour le hConvState.status sur le hMessage d'origine de la conversation je ne vois
                alors pas comment on pourrait faire plus rapide...
                */
            self[self.implementation](hMessage, context, cb);

        }else
            return cb(err, result);
    });
};

hGetThreads.prototype.mapReduce = function(hMessage, context, cb){
    var hCommand = hMessage.payload;
    var status = hCommand.params.status;
    var actor = hMessage.actor;
    var self = this;

    var map = function(){
        emit(this.convid, {
            status: this.payload.status,
            published: this.published
        })
    };

    var reduce = function(k, values){
        var chosenValue = values[0];

        values.forEach(function(value){
            if(chosenValue.published < value.published)
                chosenValue = value;
        });

        return chosenValue;
    };

    dbPool.getDb(validator.getDomainJID(actor), function(dbInstance){
        dbInstance.get(actor).mapReduce(map, reduce, {
            out: {replace : dbInstance.createPk()}}, function(err, collection) {

            if(!err){
                var convids = [];
                var stream = collection.find({}).stream();

                stream.on("data", function(elem) {
                    if(elem.value.status == status && hFilter.checkFilterValidity(elem, context.hClient.filter).result)
                        convids.push(elem._id);
                });

                stream.on("close", function(){
                    collection.drop();
                    self.filterMessages(actor, convids, context, cb);
                });
            }else
                return cb(hResultStatus.TECH_ERROR, JSON.stringify(err));

        });
    })
};

hGetThreads.prototype.linear = function(hMessage, context, cb){
    var hCommand = hMessage.payload;
    var status = hCommand.params.status;
    var actor = hMessage.actor;
    var self = this;

    dbPool.getDb(validator.getDomainJID(actor), function(dbInstance){
        var stream = dbInstance.get(actor).find({
            type: /hConvState/i
        }).streamRecords();

        var foundElements = {};
        stream.on("data", function(hMessage) {
            if(foundElements[hMessage.convid]){
                if(foundElements[hMessage.convid].published < hMessage.published)
                    foundElements[hMessage.convid] = hMessage;
            }else
                foundElements[hMessage.convid] = hMessage;

        });

        stream.on("end", function(){
            var convids = [];

            for(var convid in foundElements)
                if(foundElements[convid].payload.status == status)
                    convids.push(convid);

            self.filterMessages(actor, convids, context, cb);
        });
    });
};

hGetThreads.prototype.filterMessages = function(actor, convids, context, cb){
    var filteredConvids = [];
    var regexConvids = '(';

    //If no convids or no filters for the channel, do not access the db
    if( convids.length == 0)
        return cb(hResultStatus.OK, convids);

    for(var i = 0; i < convids.length; i++)
        regexConvids += convids[i] + '|';

    regexConvids = regexConvids.slice(0, regexConvids.length-1) + ')';

    dbPool.getDb(validator.getDomainJID(actor), function(dbInstance){
        var stream = dbInstance.get(actor).find({convid: new RegExp(regexConvids), type: {$ne: "hConvState"}}).stream();

        var convidDone = false;
        stream.on("data", function(hMessage) {
            if(hFilter.checkFilterValidity(hMessage, context.hClient.filter).result)
                if(filteredConvids.length === 0)
                    filteredConvids.push(hMessage.convid)
                else{
                    convidDone = false;
                    for(var i=0; i<filteredConvids.length; i++)
                        if(filteredConvids[i] === hMessage.convid)
                            convidDone = true
                    if(convidDone === false)
                        filteredConvids.push(hMessage.convid)
                }
        });

        stream.on("close", function(){
            cb(hResultStatus.OK, filteredConvids);
        });
    });
};

hGetThreads.prototype.checkValidity = function(hMessage, cb){
    var hCommand = hMessage.payload;
    if(!hCommand.params || !(hCommand.params instanceof Object) )
        return cb(hResultStatus.INVALID_ATTR, 'invalid params object received');

    var actor = hMessage.actor;
    var status = hCommand.params.status;

    if(!actor)
        return cb(hResultStatus.MISSING_ATTR, 'missing actor');

    if(!status)
        return cb(hResultStatus.MISSING_ATTR, 'missing status');

    if(!validator.isChannel(actor))
        return cb(hResultStatus.INVALID_ATTR, 'actor is not a channel');

    if(typeof status != 'string')
        return cb(hResultStatus.INVALID_ATTR, 'status is not a string');

    var db = dbPool.getDb('admin');
    var hChannel = db.cache.hChannels[actor];

    if(!hChannel)
        return cb(hResultStatus.NOT_AVAILABLE, 'the channel ' + actor + ' does not exist');

    if(!hChannel.active)
        return cb(hResultStatus.NOT_AUTHORIZED, 'the channel ' + actor + 'is inactive');

    if(hChannel.subscribers.indexOf(validator.getBareJID(hMessage.publisher)) < 0)
        return cb(hResultStatus.NOT_AUTHORIZED, 'the sender is not in the channel subscribers list');

    cb();
};

exports.Command = hGetThreads;
