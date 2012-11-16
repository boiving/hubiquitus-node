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

log = require("winston")
clients = {}
options = require("../options").sioConnector;

class SocketIO_Connector
  ###
  Runs a SocketIO Connector with the given arguments.
  @param args - {
  logLevel : DEBUG, INFO, WARN or ERROR
  port : int
  namespace : string
  commandOptions : {} Command Controller Options
  }
  ###
  constructor: (props) ->
    if props.owner
    then @owner = props.owner
    else throw new Error("You must pass an actor as reference")

    io = require("socket.io").listen(props.port) #Creates the HTTP server

    logLevels =
      DEBUG: 3
      INFO: 2
      WARN: 1
      ERROR: 0

    io.set "log level", logLevels[options.logLevel]

    channel = io.on("connection", (socket) =>
      id = socket.id
      clients[id] =
        id: id
        socket: socket

      socket.on "hConnect", (data) =>
        @connect clients[id], data

      socket.once "disconnect", =>
        @disconnect clients[id]

    )

  ###
  @param client - Reference to the client
  @param data - Expected {jid, password, (host), (port)}
  ###
  connect: (client, data) ->
    unless client
      log.warn "A client sent an invalid ID with data", data
      return
    log.info "Client ID " + client.id + " sent connection data", data
    if not data or not data.publisher or not data.password
      log.info "Client ID " + client.id + " is trying to connect without mandatory attribute", data
      return
    client.hClient = @owner
    inboundAdapters = []
    for i in @owner.state.inboundAdapters
      inboundAdapters.push {type:i.type, url:i.url}

    data.trackInbox = inboundAdapters
    data.actor = data.publisher
    data.inboundAdapters
    client.hClient.createChild "session", "inproc", data, (child) =>
      #Relay all server status messages
      child.initListener(client)
      client.child = child.actor

  ###
  Disconnects the current session and socket. The socket is closed but not
  the XMPP Connection (for reattaching). It will be closed after timeout.
  @param client - Reference to the client to close
  ###
  disconnect: (client) ->
    if client and client.hClient
      log.debug "Disconnecting Client " + client.publisher
      client.socket.disconnect()  if client.socket
      delete clients[client.id]
    else if client
      client.socket.disconnect()  if client.socket
      delete clients[client.id]

    msg = @owner.buildMessage(client.child, "hCommand", { cmd: "stop" })
    @owner.send msg


  start: ->
    @started = true

  stop: ->
    @started = false


exports.sIOAdapter = (props) ->
  new SocketIO_Connector(props)
