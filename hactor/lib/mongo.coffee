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

###
Mongo Abstraction Layer. This allows access to the different collections
that are managed in hubiquitus giving the user some convenience methods
to create and recover models.

To retrieve data from a collection use db.get(collectionName).find() //See mongodb-native for advanced commands

To add validators that will be executed when an element has to be updated/saved:
db.get(collectionName).validators.push(validator);
validators are functions(doc, cb). They will be executed asynchronously and they should return cb() if correct or
cb(<hResult.status>, <msg>) if there  was an error

You can add functions that will be executed when an update/save is successful using:
db.get(collectionName).onSave = [function(result),...]

There is a special collection called 'virtualHMessages'. This collection is virtual, meaning that is used to add
validators/ force mandatory attributes for all hMessages but the collection does not exist physically. Each hMessage
is saved in a collection named after the channel where it was published or in a collection called hMessages if the
message was not published but sent to another user.
###
mongo = require("mongodb")
log = require("winston")
codes = require("./codes.coffee")
validators = require("./validator.coffee")

#Events
util = require("util")
events = require("events").EventEmitter
Db = ->
  @db = null
  @server = null
  @status = codes.mongoCodes.DISCONNECTED

  # static Collections that are created at startup
  @_staticCol = ["hSubscriptions", "hChannels", "hMessages"]
  @collections = {}

  #Caches
  @cache = hChannels: {}
  events.call this

util.inherits Db, events

###
Connects to a server and then gives access to the database. Once
connected emits the event 'connect'. If already connected to a database
it will just emit the event.
@param uri - address of the database in the form: mongodb://<host>[:port]/<db>
@param opts - [Optional] options object as defined in http://mongodb.github.com/node-mongodb-native/api-generated/server.html
###
Db::connect = (uri, opts) ->
  self = this

  #Already connected
  if @status is codes.mongoCodes.CONNECTED
    @emit "connect"
    return

  #Create regex to parse/test URI
  matches = /^mongodb:\/\/(\w+)(:(\d+)|)\/(\w+)$/.exec(uri)

  #Test URI
  if matches?

    #Parse URI
    host = matches[1]
    port = parseInt(matches[3]) or 27017
    dbName = matches[4]

    #Create the Server and the DB to access mongo
    @server = new mongo.Server(host, port, opts)
    @db = new mongo.Db(dbName, @server)

    #Connect to Mongo
    @db.open (err, db) ->
      unless err

        #load static collections
        i = 0

        while i < self._staticCol.length
          self.collections[self._staticCol[i]] = db.collection(self._staticCol[i])
          self.collections[self._staticCol[i]].required = {}
          self.collections[self._staticCol[i]].validators = []
          self.collections[self._staticCol[i]].onSave = []
          i++

        #Init validators for collections and tell everyone that we are ready to go
        self._initDefaultCollections ->
          self.status = codes.mongoCodes.CONNECTED
          self.emit "connect"

        #Error opening database
      else
        self.emit "error",
          code: codes.mongoCodes.TECH_ERROR
          msg: "could not open database"


    #Invalid URI
  else
    @emit "error",
      code: codes.mongoCodes.INVALID_URI
      msg: "the URI " + uri + " is invalid"



###
Disconnects from the database. When finishes emits the event 'disconnect'
If there is no connection it will automatically emit the event disconnect
###
Db::disconnect = ->
  if @status is codes.mongoCodes.CONNECTED
    self = this
    @db.close true, ->
      self.collections = {}
      self.status = codes.mongoCodes.DISCONNECTED
      self.emit "disconnect"

    #Not Connected
  else
    @emit "disconnect"


###
Initializes static hubiquitus collections
@param cb - When initialization is finished the callback will be called.
@private
###
Db::_initDefaultCollections = (cb) ->
  @collections.hChannels.validators.push validators.validateHChannel

  #Ensure there is an index for hChannel _id
  #    this.collections.hChannels.ensureIndex('_id', {unique: true});

  #Set up cache invalidation
  self = this

  #Symbolically create hMessages
  @get "VirtualHMessages"
  stream = @collections.hChannels.find({}).streamRecords()
  stream.on "data", (hChannel) ->
    self.cache.hChannels[hChannel._id] = hChannel

  stream.on "end", cb


###
Saves an object to a collection.
@param collection a db recovered collection (db.collection())
@param doc the document to save
@param options [Optional] options object{
virtual: <collection> //The collection to use for onSavers (useful for hMessages)
}
@param cb [Optional] the Callback to pass the error/result
@private
###
Db::_saver = (collection, doc, options, cb) ->

  #Allow not to specify options and pass a callback directly
  if typeof options is "function"
    cb = options
    options = {}
  else options = {}  unless options
  callback = (err, result) ->

    #If it is treated as an update, use the original saved doc
    savedElem = (if typeof result is "number" then doc else result)
    onSave = (if options.virtual then options.virtual.onSave else collection.onSave)
    unless err
      log.debug "Correctly saved to mongodb", result
      i = 0

      while i < onSave.length
        onSave[i] savedElem
        i++
      (if typeof cb is "function" then cb(err, savedElem) else null)
    else
      log.debug "Error saving in mongodb", err
      (if typeof cb is "function" then cb(codes.hResultStatus.TECH_ERROR, "" + err) else null)

  collection.save doc,
    safe: true
  , callback


###
Updates an object from a collection (useful when using $push, $pull, etc)
@param collection a db recovered collection (db.collection())
@param selector object that selects the document to update
@param doc object following mongodb-native conventions with attributes to update
@param options [Optional] options object{
virtual: <collection> //The collection to use for onSavers (useful for hMessages)
}
@param cb [Optional] the Callback to pass the error/result
@private
###
Db::_updater = (collection, selector, doc, options, cb) ->

  #Allow not to specify options and pass a callback directly
  if typeof options is "function"
    cb = options
    options = {}
  else options = {}  unless options
  callback = (err, result) ->

    #If it is treated as an update, use the original saved doc
    savedElem = (if typeof result is "number" then doc else result)
    onSave = (if options.virtual then options.virtual.onSave else collection.onSave)
    unless err
      log.debug "Correctly updated document from mongodb", result
      i = 0

      while i < onSave.length
        onSave[i] savedElem
        i++
      (if typeof cb is "function" then cb(err, savedElem) else null)
    else
      log.debug "Error updating document in mongodb", err
      (if typeof cb is "function" then cb(codes.hResultStatus.TECH_ERROR, JSON.stringify(err)) else null)

  options.safe = true
  collection.update selector, doc, options, callback


###
Tests the validators for a document
@param doc - The document to validate
@param validators - Array of validator functions to execute
@param cb - Callback (err, msg) with error being a constant from hResult.status
@private
###
Db::_testValidators = (doc, validators, cb) ->
  counter = 0
  first = true

  #In case we don't validate anything
  cb()  if validators.length is 0
  i = 0

  while i < validators.length
    validators[i] doc, (err, msg) ->
      if err and first
        first = false
        cb err, msg
      else cb()  if ++counter is validators.length

    i++


###
Saves a hChannel to the database. If the channel given has an id existing in the database
already it will be updated.
@param hChannel - hChannel to create or update
@param useValidators - [Optional] Boolean to use or not validators (useful when creating channels as admin).
Defaults to true
@param cb - [Optional] Callback that receives (err, result)
###
Db::saveHChannel = (hChannel, useValidators, cb) ->
  if typeof useValidators is "function"
    cb = useValidators
    useValidators = true
  self = this
  callback = (err, msg) ->
    if err
      (if typeof cb is "function" then cb(err, msg) else null)
    else
      self._saver self.collections.hChannels, hChannel, cb

  if useValidators
    @_testValidators hChannel, @collections.hChannels.validators, callback
  else
    callback()


###
Saves a hMessage to the correct collection in the database. The CHID of the hMessage will *not*
be checked to see if the channel exists. A collection with the chid given will be created.
@param hMessage - hMessage to create in the database
@param cb [Optional] Callback that receives (err, result)
###
Db::saveHMessage = (hMessage, cb) ->

  #If the actor is that of a client, save it to a collection called hMessages, else to the channel's collection
  collection = (if validators.isChannel(hMessage.actor) then hMessage.actor else "hMessages")

  #Use 'virtual' hMessages collection to test requirements. But when saving use real collection
  @_saver @get(collection), hMessage,
    virtual: @get("VirtualHMessages")
  , cb


###
This method returns the collection from where it is possible to search and add validators.
@param collection - The collection name to recover.
@return the collection object.
###
Db::get = (collection) ->

  #This is needed because hMessages collections are created on the fly.
  unless @collections[collection]
    col = @db.collection(collection)
    col.validators = []
    col.required = {}
    col.onSave = []
    @collections[collection] = col
  @collections[collection]


###
Creates a valid Primary key that can be used in mongo. The returned value can be considered a UUID
@return String - PK that can be used as UUID _id in documents.
###
Db::createPk = ->
  "" + mongo.ObjectID.createPk()

exports.db = new Db()