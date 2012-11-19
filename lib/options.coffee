#
# * Copyright (c) Novedia Group 2012.
# *
# *    This file is part of Hubiquitus
# *
# *    Permission is hereby granted, free of charge, to any person obtaining a copy
# *    of this software and associated documentation files (the "Software"), to deal
# *    in the Software without restriction, including without limitation the rights
# *    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
# *    of the Software, and to permit persons to whom the Software is furnished to do so,
# *    subject to the following conditions:
# *
# *    The above copyright notice and this permission notice shall be included in all copies
# *    or substantial portions of the Software.
# *
# *    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
# *    INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
# *    PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE
# *    FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
# *    ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
# *
# *    You should have received a copy of the MIT License along with Hubiquitus.
# *    If not, see <http://opensource.org/licenses/mit-license.php>.
#
fs = require("fs")
log = require("winston")

###
Gets the commandline arguments and parses the options.
If a config file is specified in the args it will also be used.
###
createOptions = () ->
  options = {}
  args = process.argv.splice(2)
  try
    argsIt = 0

    #See if a config file is specified
    argsIt++  while argsIt < args.length and not args[argsIt].match(/--conf/)

    #If specified read it and add it to the list of args with correct formatting
    if argsIt < args.length - 1 and args[argsIt].match(/--conf/)
      file = fs.readFileSync(args[argsIt + 1], "utf8")
      file = file.split("\n")
      args = args.splice(argsIt + 2)
      argsIt = 0
      while argsIt < file.length
        args = (args.concat(file[argsIt].split(RegExp(" *= *"))))  if not file[argsIt].match(RegExp(" *#.*")) and not file[argsIt].match(/^ *$/)
        argsIt++

    #Normalize options
    tempArray = undefined
    i = 0

    while i < args.length - 1
      args[i] = args[i].replace(/-*/, "").toLowerCase()
      tempArray = args[i + 1].split(",")
      options[args[i]] = (if tempArray.length > 1 then tempArray else tempArray[0])
      i += 2

    #If the option expects an array of numbers, convert it to one
    numArray = ["socket.io.ports"]
    numArray.map (elem) ->
      if options[elem] instanceof Array
        options[elem] = options[elem].map((el) ->
          parseInt el
        )
      else options[elem] = [parseInt(options[elem])]  if options[elem]


    #If the option expects a number convert it to one
    intNeeded = ["socket.io.disctimeout", "socket.io.ridwindow", "hnode.port"]
    intNeeded.map (el) ->
      options[el] = parseInt(options[el])

    options = overrideOptions(options)
  catch err
    log.error "Error parsing options.", err
    process.exit 1
  options

###
Receives an object with non-default options and overrides the default ones
returning a new options object with the default values for the options
not specified
@param options
###
overrideOptions = (options) ->
  options = options or {}
  _opts =

  #Possible values are DEBUG, INFO, WARN or ERROR
    "global.loglevel": options["global.loglevel"] or "WARN"

    #A different instance will be created for each port
    "socket.io.ports": options["socket.io.ports"] or [8080]

    #websocket Namespace for events received/sent
    "socket.io.namespace": options["socket.io.namespace"] or ""

    #full name of the component (ie. jid.domain)
    "hnode.jid": options["hnode.jid"] or "hnode@localhost"

    #Shared secret between the hNode component and the XMPP Server
    "hnode.password": options["hnode.password"] or "hnode"

    #Host of the XMPP Server
    "hnode.host": options["hnode.host"] or ""

    #Port of the XMPP Server
    "hnode.port": options["hnode.port"] or `undefined`

    #Path to the hcommands executed by the hnode
    "hcommands.path": options["hcommands.path"] or "lib/hcommands"

    #Timeout for an hCommand, after that an hResult with timeout is sent
    "hcommands.timeout": options["hcommands.timeout"] or 5000

    #URI for the MongoDB database
    "mongo.URI": options["mongo.uri"] or "mongodb://localhost/admin"

  _opts

options = createOptions
###
Global options for the whole application
###
exports.options = options

###
Function that parses the options (useful for testing)
@type {Function}
###
exports.createOptions = createOptions()

###
Options object already formatted to be used with the command controller
###
commandController =
  modulePath: options["hcommands.path"]
  timeout: options["hcommands.timeout"]

exports.commandController = commandController

###
Options object already formatted to be used with the Socket.io connector
###
exports.sioConnector =
  logLevel: options["global.loglevel"]
  namespace: options["socket.io.namespace"]
  _mongoURI: options["mongo.URI"]
