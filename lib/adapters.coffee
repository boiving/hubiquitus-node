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

url = require "url"
zmq = require "zmq"

class Adapter

  constructor: (props) ->
    @started = false
    if props.owner
    then @owner = props.owner
    else throw new Error("You must pass an actor as reference")

  start: ->
    @started = true

  stop: ->
    @started = false

class InboundAdapter extends Adapter

  constructor: (props) ->
    super

  genListenPort: ->
    Math.floor(Math.random() * 98)+3000

class SocketInboundAdapter extends InboundAdapter

  constructor: (props) ->
    super
    if props.url then @url = props.url else @url = "tcp://127.0.0.1:#{@genListenPort}"
    @type = "socket"
    @sock = zmq.socket "pull"
    @sock.identity = "SocketIA_of_#{@owner.actor}"
    @sock.on "message", (data) =>
      @owner.emit "message", JSON.parse(data)

  start: ->
    unless @started
      @sock.bindSync @url
      @owner.log "debug", "#{@sock.identity} listening on #{@url}"
      super

  stop: ->
    if @started
      @sock.close()
      super

class LBSocketInboundAdapter extends InboundAdapter

  constructor: (props) ->
    super
    if props.url then @url = props.url else @url = "tcp://127.0.0.1:#{@genListenPort}"
    @type = "lb_socket"
    @sock = zmq.socket "pull"
    @sock.identity = "LBSocketIA_of_#{@owner.actor}"
    @sock.on "message", (data) => @owner.emit "message", JSON.parse(data)

  start: ->
    unless @started
      @sock.connect @url
      @owner.log "debug", "#{@sock.identity} listening on #{@url}"
      super

  stop: ->
    if @started
      @sock.close()
      super

class ChannelInboundAdapter extends InboundAdapter

  constructor: (props) ->
    props.targetActorAid = "#{props.owner.aid}#workers"
    super
    if props.url
    then @url = props.url
    else throw new Error("You must provide a channel url")
    @type = "channel"
    @sock = zmq.socket "sub"
    @sock.identity = "ChannelIA_of_#{@owner.actor}"
    @sock.on "message", (data) => @owner.emit "message", JSON.parse(data)

  start: ->
    unless @started
      @sock.connect @url
      @sock.subscribe("")
      @owner.log "debug", "#{@sock.identity} subscribe on #{@url}"
      super

  stop: ->
    if @started
      @sock.close()
      super

class OutboundAdapter extends Adapter

  constructor: (props) ->
    if props.targetActorAid
      @targetActorAid = props.targetActorAid
    else
      throw new Error "You must provide the AID of the targeted actor"
    super

  start: ->
    super

  send: (message) ->
    throw new Error "Send method should be overriden"

class LocalOutboundAdapter extends OutboundAdapter

  constructor: (props) ->
    super
    if props.ref
    then @ref = props.ref
    else throw new Error("You must explicitely pass an actor as reference to a LocalOutboundAdapter")

  start: ->
    super

  send: (message) ->
    @start() unless @started
    @ref.emit "message", message

class ChildprocessOutboundAdapter extends OutboundAdapter

  constructor: (props) ->
    super
    if props.ref
    then @ref = props.ref
    else throw new Error("You must explicitely pass an actor child process as reference to a ChildOutboundAdapter")

  start: ->
    super

  stop: ->
    if @started
      @ref.kill()
    super

  send: (message) ->
    @start() unless @started
    @ref.send message

class SocketOutboundAdapter extends OutboundAdapter

  constructor: (props) ->
    super
    if props.url
    then @url = props.url
    else throw new Error("You must explicitely pass a valid url to a SocketOutboundAdapter")
    @sock = zmq.socket "push"
    @sock.identity = "SocketOA_of_#{@owner.actor}_to_#{@targetActorAid}"

  start:->
    super
    @sock.connect @url
    @owner.log "debug", "#{@sock.identity} writing on #{@url}"


  stop: ->
    if @started
      @sock.close()

  send: (message) ->
    @start() unless @started
    @sock.send JSON.stringify(message)

class LBSocketOutboundAdapter extends OutboundAdapter

  constructor: (props) ->
    super
    if props.url
    then @url = props.url
    else throw new Error("You must explicitely pass a valid url to a LBSocketOutboundAdapter")
    @sock = zmq.socket "push"
    @sock.identity = "LBSocketOA_of_#{@owner.actor}_to_#{@targetActorAid}"

  start:->

    @sock.bindSync @url
    @owner.log "debug", "#{@sock.identity} bound on #{@url}"
    super

  stop: ->
    if @started
      @sock.close()

  send: (message) ->
    @start() unless @started
    @sock.send JSON.stringify(message)


class ChannelOutboundAdapter extends OutboundAdapter

  constructor: (props) ->
    props.targetActorAid = "#{props.owner.actor}#subscribers"
    super
    if props.url
    then @url = props.url
    else throw new Error("You must explicitely pass a valid url to a ChannelOutboundAdapter")
    @sock = zmq.socket "pub"
    @sock.identity = "ChannelOA_of_#{@owner.actor}"

  start:->
    @sock.bindSync @url
    @owner.log "debug", "#{@sock.identity} streaming on #{@url}"
    super

  stop: ->
    if @started
      @sock.close()

  send: (message) ->
    @start() unless @started
    @sock.send JSON.stringify(message)

exports.inboundAdapter = (type, props) ->
  switch type
    when "socket"
      new SocketInboundAdapter(props)
    when "lb_socket"
      new LBSocketInboundAdapter(props)
    when "channel"
      new ChannelInboundAdapter(props)
    else
      throw new Error "Incorrect type '#{type}'"

exports.outboundAdapter = (type, props) ->

  switch type
    when "inproc"
      new LocalOutboundAdapter(props)
    when "fork"
      new ChildprocessOutboundAdapter(props)
    when "socket"
      new SocketOutboundAdapter(props)
    when "lb_socket"
      new LBSocketOutboundAdapter(props)
    when "channel"
      new ChannelOutboundAdapter(props)
    else
      throw new Error "Incorrect type '#{type}'"

exports.OutboundAdapter = OutboundAdapter