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

var errors = require('./codes.js').errors;

var codes = require('./codes.js');

var validator = require('./validators.js');

var log = require('winston');

exports.checkFilterFormat = function(hCondition){
    if(!hCondition || !(hCondition instanceof Object) )
        return {result:false, error:'the filter is not a valid object'};
    var next;
    var checkFormat;

    if(Object.getOwnPropertyNames(hCondition).length === 0)
        return {result:true, error:''};

    for(var i = 0; i < Object.getOwnPropertyNames(hCondition).length; i++){
        switch(Object.getOwnPropertyNames(hCondition)[i]){
            case 'eq' :
            case 'ne' :
            case 'gt' :
            case 'gt' :
            case 'gte' :
            case 'lt' :
            case 'lte' :
            case 'in' :
            case 'nin':
                for(var key in hCondition){
                    if(!hCondition[key] || !(hCondition[key] instanceof Object))
                        return {result:false, error:'The attribute of an operand '+key+' must be an object'};
                }
                break;
            case 'and' :
            case 'or' :
            case 'nor' :
                next = hCondition.and || hCondition.or || hCondition.nor ;
                if(next.length <= 1 || next.length === undefined)
                    return {result:false, error:'The attribute must be an array with at least 2 elements'};
                for(var j = 0; j < next.length; j++){
                    checkFormat = exports.checkFilterFormat(next[j]);
                    if(checkFormat.result === false)
                        return {result:false, error:checkFormat.error};
                }               
                break;
            case 'not':
                if(!hCondition.not || !(hCondition.not instanceof Object) || hCondition.not.length !== undefined)
                    return {result:false, error:'The attribute of an operand "not" must be an object'};
                checkFormat = exports.checkFilterFormat(hCondition.not);
                if(checkFormat.result === false)
                    return {result:false, error:checkFormat.error};
                break;
            case 'relevant':
                if(typeof hCondition.relevant !== "boolean")
                    return {result:false, error:'The attribute of an operand "relevant" must be a boolean'};
                break;
            case 'geo':
                if(typeof hCondition.geo.lat !== 'number' || typeof hCondition.geo.lng !== 'number' || typeof hCondition.geo.radius !== 'number')
                    return {result:false, error:'Attributes of an operand "geo" must be numbers'};
                break
            case 'boolean':
                if(typeof hCondition.boolean !== 'boolean')
                    return {result:false, error:'The attribute of an operand "boolean" must be a boolean'};
                break
            default :
                return {result:false, error:'A filter must start with a valid operand'};
        }
    }

    return {result:true, error:''};
}
exports.findPath = function(element, tab){
    var path = element
    while(path !== undefined)
    {
        if(path[tab[0]] !== undefined && path[tab[0]] !== null)
            path = path[tab[0]];
        else
            return path
        tab.shift();
    }
}


exports.checkFilterValidity = function(hMessage, hCondition){

    var db = require('./dbPool.js').db.getDb(validator.getDomainJID(hMessage.actor));
    var i, j, k;
    var filter;
    var actor = hMessage.actor;
    var validate = [];
    var operand;
    var key;
    var checkValidity, error;

    if(Object.getOwnPropertyNames(hCondition).length === 0 && validator.isChannel(actor)) {
        filter = db.cache.hChannels[actor].filter
    }
    else
        filter = hCondition;

    if(Object.getOwnPropertyNames(filter).length > 0){
        for(i = 0; i < Object.getOwnPropertyNames(filter).length; i++){
            switch(Object.getOwnPropertyNames(filter)[i]){
                case 'eq' :
                    operand = [];
                    k = 0;
                    for(key in filter.eq){
                        var message = exports.findPath(hMessage, key.split('.'));
                        if(key === 'publisher')
                            message = message.replace(/\/.*/, '');
                        if(filter.eq[key] === message){
                            operand[k] = true;
                            k++;
                        }
                    }
                    if(operand.length === Object.getOwnPropertyNames(filter.eq).length)
                        validate[i] = {result:true, error:''};
                    else
                        validate[i] = {result:false, error:'hCondition '+filter+' is not validate'};
                    break;

                case 'ne' :
                    operand = [];
                    k = 0;
                    for(key in filter.ne){
                        var message = exports.findPath(hMessage, key.split('.'));
                        if(message === hMessage)
                            return {result:false, error:'Attribute not find in hMessage'};
                        if(key === 'publisher')
                            message = message.replace(/\/.*/, '');
                        if(filter.ne[key] === message){
                            operand[k] = true;
                            k++;
                        }
                    }
                    if(operand.length === 0)
                        validate[i] = {result:true, error:''};
                    else
                        validate[i] = {result:false, error:'hCondition '+filter+' is not validate'};
                    break;

                case 'gt' :
                    operand = [];
                    k = 0;
                    for(key in filter.gt){
                        var message = exports.findPath(hMessage, key.split('.'));
                        if(typeof filter.gt[key] !== 'number' && typeof hMessage[key] !== 'number')
                            return {result:false, error:'Attribut of operand "gt" must be a number'};
                        if(filter.gt[key] < message){
                            operand[k] = true;
                            k++;
                        }
                    }
                    if(operand.length === Object.getOwnPropertyNames(filter.gt).length)
                        validate[i] = {result:true, error:''};
                    else
                        validate[i] = {result:false, error:'hCondition '+filter+' is not validate'};
                    break;

                case 'gte' :
                    operand = [];
                    k = 0;
                    for(key in filter.gte){
                        var message = exports.findPath(hMessage, key.split('.'));
                        if(typeof filter.gte[key] !== 'number' && typeof hMessage[key] !== 'number')
                            return {result:false, error:'Attribut of operand "gte" must be a number'};
                        if(filter.gte[key] <= message){
                            operand[k] = true;
                            k++;
                        }
                    }
                    if(operand.length === Object.getOwnPropertyNames(filter.gte).length)
                        validate[i] = {result:true, error:''};
                    else
                        validate[i] = {result:false, error:'hCondition '+filter+' is not validate'};
                    break;

                case 'lt' :
                    operand = [];
                    k = 0;
                    for(key in filter.lt){
                        var message = exports.findPath(hMessage, key.split('.'));
                        if(typeof filter.lt[key] !== 'number' && typeof hMessage[key] !== 'number')
                            return {result:false, error:'Attribut of operand "lt" must be a number'};
                        if(filter.lt[key] > message){
                            operand[k] = true;
                            k++;
                        }
                    }
                    if(operand.length === Object.getOwnPropertyNames(filter.lt).length)
                        validate[i] = {result:true, error:''};
                    else
                        validate[i] = {result:false, error:'hCondition '+filter+' is not validate'};
                    break;

                case 'lte' :
                    operand = [];
                    k = 0;
                    for(key in filter.lte){
                        var message = exports.findPath(hMessage, key.split('.'));
                        if(typeof filter.lte[key] !== 'number' && typeof hMessage[key] !== 'number')
                            return {result:false, error:'Attribut of operand "lte" must be a number'};
                        if(filter.lte[key] >= message){
                            operand[k] = true;
                            k++;
                        }
                    }
                    if(operand.length === Object.getOwnPropertyNames(filter.lte).length)
                        validate[i] = {result:true, error:''};
                    else
                        validate[i] = {result:false, error:'hCondition '+filter+' is not validate'};
                    break;

                case 'in' :
                    operand = [];
                    k = 0;
                    for(key in filter.in){
                        var message = exports.findPath(hMessage, key.split('.'));
                        if(typeof filter.in[key] === 'string')
                            return {result:false, error:'Attribute of operand "in" must be a object'};
                        for(j = 0; j < filter.in[key].length; j++){
                            if(key === 'publisher')
                                message = message.replace(/\/.*/, '');
                            if(filter.in[key][j] === message){
                                operand[k] = true;
                                k++;
                            }
                        }
                    }
                    if(operand.length === Object.getOwnPropertyNames(filter.in).length)
                        validate[i] = {result:true, error:''};
                    else
                        validate[i] = {result:false, error:'hCondition '+filter+' is not validate'};
                    break;

                case 'nin':
                    operand = [];
                    k = 0;
                    for(key in filter.nin){
                        var message = exports.findPath(hMessage, key.split('.'));
                        if(message === hMessage || typeof filter.nin[key] === 'string')
                            return {result:false, error:'Attribute of operand "nin" must be a object'};
                        for(j = 0; j < filter.nin[key].length; j++){
                            if(key === 'publisher')
                                message = message.replace(/\/.*/, '');
                            if(filter.nin[key][j] === message){
                                operand[k] = true;
                                k++;
                            }
                        }
                    }
                    if(operand.length === 0)
                        validate[i] = {result:true, error:''};
                    else
                        validate[i] = {result:false, error:'hCondition '+filter+' is not validate'};
                    break;

                case 'and' :
                    operand = [];
                    checkValidity = undefined;
                    error = [];
                    
                    k = 0;
                    if(filter.and.length <= 1 || filter.and.length === undefined)
                        return {result:false, error:'Attribut of operand "and" must be an array with at least 2 elements'};
                    for(j = 0; j < filter.and.length; j++){
                        checkValidity = exports.checkFilterValidity(hMessage, filter.and[j])
                        if(checkValidity.result){
                            operand[k] = true;
                            k++;
                        }
                        else
                            error[j] = filter.and[j];
                    }
                    if(operand.length === filter.and.length)
                        validate[i] = {result:true, error:''};
                    else
                        validate[i] = {result:false, error:'hCondition '+error+' is not validate'};
                    break;

                case 'nor' :
                    operand = [];
                    checkValidity = undefined;
                    error = [];

                    k = 0;
                    if(filter.nor.length <= 1 || filter.nor.length === undefined)
                        return {result:false, error:'Attribute of operand "nor" must be an array with at least 2 elements'}
                    for(j = 0; j < filter.nor.length; j++){
                        checkValidity = exports.checkFilterValidity(hMessage, filter.nor[j])
                        if(checkValidity.result){
                            operand[k] = true;
                            k++;
                            error = filter.nor[j];
                        }
                    }
                    if(operand.length === 0)
                        validate[i] = {result:true, error:''};
                    else
                        validate[i] = {result:false, error:'hCondition '+error+' is validate'};
                    break;

                case 'or' :
                    operand = [];
                    checkValidity = undefined;
                    error = [];

                    k = 0;
                    if(filter.or.length <= 1 || filter.or.length === undefined)
                        return {result:false, error:'Attribute of operand "or" must be an array with at least 2 elements'};
                    for(j = 0; j < filter.or.length; j++){
                        checkValidity = exports.checkFilterValidity(hMessage, filter.or[j])
                        if(checkValidity.result){
                            operand[k] = true;
                            k++;
                        }
                        else
                            error = filter.or[j];
                    }
                    if(operand.length > 0)
                        validate[i] = {result:true, error:''};
                    else
                        validate[i] = {result:false, error:'hCondition '+error+' is not validate'};
                    break;

                case 'not':
                    operand = [];
                    k = 0;
                    if(Object.getOwnPropertyNames(filter.not).length === 0)
                        return {result:false, error:'Attribute of operand "not" must be an object'};
                    checkValidity = exports.checkFilterValidity(hMessage, filter.not)
                    if(checkValidity.result === false){
                        operand[k] = true;
                        k++;
                    }
                    if(operand.length !== 0)
                        validate[i] = {result:true, error:''};
                    else
                        validate[i] = {result:false, error:'hCondition '+filter.not+' is validate'};
                    break;

                case 'relevant':
                    if(typeof filter.relevant !== "boolean" && hMessage.relevance !== 'string')
                        return {result:false, error:'Attribute of operand "relevant" must be a boolean'};
                    if(filter.relevant === true)
                        if(new Date() <= new Date(hMessage.relevance))
                            return {result:true, error:''};
                        else
                            return {result:false, error:'hCondition '+filter+' is not validate'};
                    else
                        if(new Date() > new Date(hMessage.relevance))
                            return {result:true, error:''};
                        else
                            return {result:false, error:'hCondition '+filter+' is not validate'};
                    break;

                case 'geo':
                    //Adapted from http://www.movable-type.co.uk/scripts/latlong.html
                    if( !filter.geo.radius || typeof filter.geo.lat !== 'number' || typeof filter.geo.lng !== 'number') //Radius not set, lat or lng NaN, ignore test
                        return {result:false, error:'Invalid geo attribute in the filter'};

                    //lat or lng do not exist in msg
                    if( !hMessage.location || typeof hMessage.location.pos.lat !== 'number' || typeof hMessage.location.pos.lng !== 'number')
                        return {result:false, error:'Invalid position attribute in the hMessage'};

                    var R = 6371; //Earth radius in KM
                    var latChecker = (filter.geo.lat * Math.PI / 180), lngChecker= (filter.geo.lng * Math.PI / 180);
                    var latToCheck = (hMessage.location.pos.lat * Math.PI / 180), lngToCheck = (hMessage.location.pos.lng * Math.PI / 180);
                    var dLat = latChecker - latToCheck;
                    var dLon = lngChecker - lngToCheck;

                    var a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(latChecker) * Math.cos(latToCheck) * Math.sin(dLon/2) * Math.sin(dLon/2);
                    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
                    var d = R * c;
                    var checkgeo = Math.abs(d*1000) <= filter.geo.radius
                    if(checkgeo)
                        return {result:true, error:''};
                    else
                        return {result:false, error:'hCondition '+filter+' is not validate'};
                    break

                case 'boolean':
                    if(typeof filter.boolean !== "boolean")
                        return {result:false, error:'Attribute of operand "boolean" must be a boolean'};
                    if(filter.boolean === true)
                        return {result:true, error:''};
                    else
                        return {result:false, error:'the user\'s filter refuse all hMessage'};
                    break;

                default :
                    return {result:false, error:'The filter is not valid'};
            }
        }

    }
    if(validate.length === 0)
        return {result:true, error:''};
    else
        for(i = 0; i < validate.length; i++){
            if(validate[i].result === false){
                return {result:false, error:validate[i].error};
            }
        }
    return {result:true, error:''};
};