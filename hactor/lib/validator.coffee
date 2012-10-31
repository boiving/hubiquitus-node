#
# * Copyright (c) Novedia Group 2012.
# *
# *     This file is part of Hubiquitus.
# *
# *     Hubiquitus is free software: you can redistribute it and/or modify
# *     it under the terms of the GNU General Public License as published by
# *     the Free Software Foundation, either version 3 of the License, or
# *     (at your option) any later version.
# *
# *     Hubiquitus is distributed in the hope that it will be useful,
# *     but WITHOUT ANY WARRANTY; without even the implied warranty of
# *     MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# *     GNU General Public License for more details.
# *
# *     You should have received a copy of the GNU General Public License
# *     along with Hubiquitus.  If not, see <http://www.gnu.org/licenses/>.
#

codes = require("./codes.coffee").hResultStatus
log = require("winston")
db = require("./mongo.coffee").db

###
Checks if an hMessage is correctly formatted and has all the correct attributes
@param hMessage - hMessage to validate
@param cb - Function (err, result) where err is from hResult.status or nothing and
result is a string or nothing
###
exports.validateHMessage = (hMessage, cb) ->
  return cb(codes.MISSING_ATTR, "invalid params object received")  if not hMessage or typeof hMessage isnt "object"
  return cb(codes.MISSING_ATTR, "missing actor attribute in hMessage")  unless hMessage.actor
  return cb(codes.INVALID_ATTR, "hMessages actor is invalid")  unless exports.validateJID(hMessage.actor)
  return cb(codes.INVALID_ATTR, "hMessage type is not a string")  if hMessage.type and typeof hMessage.type isnt "string"
  if hMessage.priority
    return cb(codes.INVALID_ATTR, "hMessage priority is not a number")  unless typeof hMessage.priority is "number"
    return cb(codes.INVALID_ATTR, "hMessage priority is not a valid constant")  if hMessage.priority > 5 or hMessage.priority < 0
  if hMessage.relevance
    hMessage.relevance = new Date(hMessage.relevance) #Sent as a string, convert back to date
    return cb(codes.INVALID_ATTR, "hMessage relevance is specified and is not a valid date object")  if hMessage.relevance is "Invalid Date"
  return cb(codes.INVALID_ATTR, "hMessage persistent is not a boolean")  if hMessage.persistent and typeof hMessage.persistent isnt "boolean"
  return cb(codes.INVALID_ATTR, "hMessage location is not an Object")  if hMessage.location and (hMessage.location not instanceof Object)
  return cb(codes.INVALID_ATTR, "hMessage author is not a JID")  if hMessage.author and not exports.validateJID(hMessage.author)
  return cb(codes.MISSING_ATTR, "hMessage missing publisher")  unless hMessage.publisher
  if hMessage.published
    hMessage.published = new Date(hMessage.published) #Sent as a string, convert back to date
    return cb(codes.INVALID_ATTR, "hMessage published is specified and is not a valid date object")  if hMessage.published is "Invalid Date"
  return cb(codes.INVALID_ATTR, "invalid headers object received")  if typeof hMessage.headers isnt "undefined" and (hMessage.headers not instanceof Object)
  if hMessage.headers
    return cb(codes.INVALID_ATTR, "invalid RELEVANCE_OFFSET header received")  if hMessage.headers.RELEVANCE_OFFSET and typeof hMessage.headers.RELEVANCE_OFFSET isnt "number"
    return cb(codes.INVALID_ATTR, "invalid MAX_MSG_RETRIEVAL header received")  if hMessage.headers.MAX_MSG_RETRIEVAL and typeof hMessage.headers.MAX_MSG_RETRIEVAL isnt "number"
  if exports.isChannel(hMessage.actor)
    log.debug "actors : " + hMessage.actor + "Channels : " + JSON.stringify(db.cache.hChannels)
    channel = db.cache.hChannels[hMessage.actor]
    return cb(codes.NOT_AVAILABLE, "the channel does not exist")  unless channel
    return cb(codes.NOT_AUTHORIZED, "the channel is inactive")  if channel.active is false
  cb codes.OK

###
Returns true or false if it is a valid JID following hubiquitus standards
@param jid - the jid string to validate
###
exports.validateJID = (jid) ->
  /(^[^@\/<>'"]+(@.+|$)|^[^#@]((?!@).)*$)/.test jid
  #new RegExp("^(?:([^@/<>'\"]+)@)([^@/<>'\"]+)(?:/([^/<>'\"]*))?/.*").test jid

###
Tests if the given jid is that of a channel. This does not test if the channel is valid
or the domain.
@param jid
@return {Boolean} true if it's a channel
###
exports.isChannel = (jid) ->
  /(^#[^@\/<>'"]+(@.+|$)|^[^#@]((?!@).)*$)/.test jid


###
Splits a VALID JID in three parts: (user)(domain)(resource), the third part can be empty
@param jid - JID to split
###
exports.splitJID = (jid) ->
  splitted = jid.match(new RegExp("^(?:([^@/<>'\"]+)@)([^@/<>'\"]+)(?:/([^/<>'\"]*))?$"))  if typeof jid is "string"
  (if splitted then splitted.splice(1, 3) else [`undefined`, `undefined`, `undefined`])

exports.getBareJID = (jid) ->
  jidParts = exports.splitJID(jid)
  jidParts[0] + "@" + jidParts[1]


###
Compares two JIDs. Can use modifiers to ignore certain parts
@param jid1 - First JID to compare
@param jid2 - Second JID
@param mod - String with modifiers. Accepted:
r: considers resource
@return {Boolean} true if equal.
###
exports.compareJIDs = (jid1, jid2, mod) ->
  return false  if not exports.validateJID(jid1) or not exports.validateJID(jid2)
  j1 = exports.splitJID(jid1)
  j2 = exports.splitJID(jid2)
  return false  if not j1 or not j2
  if /r/.test(mod)
    j1[0] is j2[0] and j1[1] is j2[1] and j1[2] is j2[2]
  else
    j1[0] is j2[0] and j1[1] is j2[1]


###
Returns the domain from a well formed JID, or null if domain not found.
@param jid - The bare/full JID to parse
@return a domain in the form of a string
###
exports.getDomainJID = (jid) ->
  exports.splitJID(jid)[1]