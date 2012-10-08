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
var db = require('./mongo.js').db;

exports.checkFilterFormat = function(hCondition){
    if(!hCondition || !(hCondition instanceof Object) )
        return false;
    var next;

    if(Object.getOwnPropertyNames(hCondition).length === 0)
        return true;

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
                        return false;
                }
                break;
            case 'and' :
            case 'or' :
            case 'nor' :
                next = hCondition.and || hCondition.or || hCondition.nor ;
                if(next.length <= 1 || next.length === undefined)
                    return false;
                exports.checkFilterFormat(next);
                break;
            case 'not':
                if(!hCondition.not || !(hCondition.not instanceof Object) || hCondition.not.length !== undefined)
                    return false;
                if(exports.checkFilterFormat(hCondition.not) === false)
                    return false;
                break;
            case 'relevant':
                if(typeof hCondition.relevant !== "boolean")
                    return false;
                break;
            case 'geo':
                if(typeof hCondition.geo.lat !== 'number' || typeof hCondition.geo.lng !== 'number' || typeof hCondition.geo.radius !== 'number')
                    return false;
                break
            default :
                return false;
        }
    }

    return true ;
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

    var i, j, k;
    var filter;
    var actor = hMessage.actor;
    var validate = [];
    var operand;
    var key;

    if(Object.getOwnPropertyNames(hCondition).length === 0 && validator.isChannel(actor)) {
        filter = db.cache.hChannels[actor].filter
    }
    else
        filter = hCondition;

    if(exports.checkFilterFormat(filter) === false)
        return false;

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
                        validate[i] = true;
                    else
                        validate[i] = false;
                    break;

                case 'ne' :
                    operand = [];
                    k = 0;
                    for(key in filter.ne){
                        var message = exports.findPath(hMessage, key.split('.'));
                        if(message === hMessage)
                            return false;
                        if(key === 'publisher')
                            message = message.replace(/\/.*/, '');
                        if(filter.ne[key] === message){
                            operand[k] = true;
                            k++;
                        }
                    }
                    if(operand.length === 0)
                        validate[i] = true;
                    else
                        validate[i] = false;
                    break;

                case 'gt' :
                    operand = [];
                    k = 0;
                    for(key in filter.gt){
                        var message = exports.findPath(hMessage, key.split('.'));
                        if(typeof filter.gt[key] !== 'number' && typeof hMessage[key] !== 'number')
                            return false;
                        if(filter.gt[key] < message){
                            operand[k] = true;
                            k++;
                        }
                    }
                    if(operand.length === Object.getOwnPropertyNames(filter.gt).length)
                        validate[i] = true;
                    else
                        validate[i] = false;
                    break;

                case 'gte' :
                    operand = [];
                    k = 0;
                    for(key in filter.gte){
                        var message = exports.findPath(hMessage, key.split('.'));
                        if(typeof filter.gte[key] !== 'number' && typeof hMessage[key] !== 'number')
                            return false;
                        if(filter.gte[key] <= message){
                            operand[k] = true;
                            k++;
                        }
                    }
                    if(operand.length === Object.getOwnPropertyNames(filter.gte).length)
                        validate[i] = true;
                    else
                        validate[i] = false;
                    break;

                case 'lt' :
                    operand = [];
                    k = 0;
                    for(key in filter.lt){
                        var message = exports.findPath(hMessage, key.split('.'));
                        if(typeof filter.lt[key] !== 'number' && typeof hMessage[key] !== 'number')
                            return false;
                        if(filter.lt[key] > message){
                            operand[k] = true;
                            k++;
                        }
                    }
                    if(operand.length === Object.getOwnPropertyNames(filter.lt).length)
                        validate[i] = true;
                    else
                        validate[i] = false;
                    break;

                case 'lte' :
                    operand = [];
                    k = 0;
                    for(key in filter.lte){
                        var message = exports.findPath(hMessage, key.split('.'));
                        if(typeof filter.lte[key] !== 'number' && typeof hMessage[key] !== 'number')
                            return false;
                        if(filter.lte[key] >= message){
                            operand[k] = true;
                            k++;
                        }
                    }
                    if(operand.length === Object.getOwnPropertyNames(filter.lte).length)
                        validate[i] = true;
                    else
                        validate[i] = false;
                    break;

                case 'in' :
                    operand = [];
                    k = 0;
                    for(key in filter.in){
                        var message = exports.findPath(hMessage, key.split('.'));
                        if(typeof filter.in[key] === 'string')
                            return false;
                        for(j = 0; j < filter.in[key].length; j++){
                            if(key === 'publisher')
                                message = message.replace(/\/.*/, '');
                            if(filter.in[key][j] === message){
                                operand[k] = true;
                                k++;
                            }
                        }
                    }
                    if(operand.length === Object.getOwnPropertyNames(filter.in).length){
                        validate[i] = true;
                    }
                    else{
                        validate[i] = false;
                    }
                    break;

                case 'nin':
                    operand = [];
                    k = 0;
                    for(key in filter.nin){
                        var message = exports.findPath(hMessage, key.split('.'));
                        if(message === hMessage || typeof filter.nin[key] === 'string')
                            return false;
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
                        validate[i] = true;
                    else
                        validate[i] = false;
                    break;

                case 'and' :
                    operand = [];
                    k = 0;
                    if(filter.and.length <= 1 || filter.and.length === undefined)
                        return false;
                    for(j = 0; j < filter.and.length; j++){
                        if(exports.checkFilterValidity(hMessage, filter.and[j])){
                            operand[k] = true;
                            k++;
                        }
                    }
                    if(operand.length === filter.and.length)
                        validate[i] = true;
                    else
                        validate[i] = false;
                    break;

                case 'nor' :
                    operand = [];
                    k = 0;
                    if(filter.nor.length <= 1 || filter.nor.length === undefined)
                        return false;
                    for(j = 0; j < filter.nor.length; j++){
                        if(exports.checkFilterValidity(hMessage, filter.nor[j])){
                            operand[k] = true;
                            k++;
                        }
                    }
                    if(operand.length === 0)
                        validate[i] = true;
                    else
                        validate[i] = false;
                    break;

                case 'or' :
                    operand = [];
                    k = 0;
                    if(filter.or.length <= 1 || filter.or.length === undefined)
                        return false;
                    for(j = 0; j < filter.or.length; j++){
                        if(exports.checkFilterValidity(hMessage, filter.or[j])){
                            operand[k] = true;
                            k++;
                        }
                    }
                    if(operand.length > 0)
                        validate[i] = true;
                    else
                        validate[i] = false;
                    break;

                case 'not':
                    operand = [];
                    k = 0;
                    if(Object.getOwnPropertyNames(filter.not).length === 0)
                        return false;
                    if(exports.checkFilterValidity(hMessage, filter.not) === false){
                        operand[k] = true;
                        k++;
                    }
                    if(operand.length !== 0)
                        validate[i] = true;
                    else
                        validate[i] = false;
                    break;

                case 'relevant':
                    if(typeof filter.relevant !== "boolean" && hMessage.relevance !== 'string')
                        return false;
                    if(filter.relevant === true)
                        if(new Date() <= new Date(hMessage.relevance))
                            return true;
                        else
                            return false;
                    else
                        if(new Date() > new Date(hMessage.relevance))
                            return true;
                        else
                            return false;
                    break;

                case 'geo':
                    //Adapted from http://www.movable-type.co.uk/scripts/latlong.html
                    if( !filter.geo.radius || typeof filter.geo.lat !== 'number' || typeof filter.geo.lng !== 'number') //Radius not set, lat or lng NaN, ignore test
                        return false;

                    //lat or lng do not exist in msg
                    if( !hMessage.location || typeof hMessage.location.pos.lat !== 'number' || typeof hMessage.location.pos.lng !== 'number')
                        return false;

                    var R = 6371; //Earth radius in KM
                    var latChecker = (filter.geo.lat * Math.PI / 180), lngChecker= (filter.geo.lng * Math.PI / 180);
                    var latToCheck = (hMessage.location.pos.lat * Math.PI / 180), lngToCheck = (hMessage.location.pos.lng * Math.PI / 180);
                    var dLat = latChecker - latToCheck;
                    var dLon = lngChecker - lngToCheck;

                    var a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(latChecker) * Math.cos(latToCheck) * Math.sin(dLon/2) * Math.sin(dLon/2);
                    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
                    var d = R * c;
                    return Math.abs(d*1000) <= filter.geo.radius;
                    break

                default :
                    return false;
            }
        }

    }
    if(validate.length === 0)
        return true
    else
        for(i = 0; i < validate.length; i++){
            if(validate[i] === false){
                return false
            }
        }
    return true;
};

exports.validateFilter = function(hMessage, hCondition){

    var i;
    var filter;
    var actor = hMessage.actor;
    var publisher = hMessage.publisher.replace(/\/.*/, '');
    var validate = false;

    if(validator.isChannel(actor)) {
        filter = db.cache.hChannels[actor].filter
    }
    else
        filter = hCondition;

    if(Object.getOwnPropertyNames(filter).length > 0){
        for(i = 0; i < filter.in.publisher.length; i++){
            if(!validate && filter.in.publisher[i] === publisher){
                validate = true;
            }
        }
    }
    else
        validate = true;

    return validate;
};
