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

{Actor} = require "./actor"
adapters = require "./../adapters"
zmq = require "zmq"

class Dispatcher extends Actor

  constructor: (props) ->
    super
    @workersAlias = "#{@actor}#workers"
    @addWorkers(props.workers)
    @nbWorkers = props.workers.nb

  addWorkers : (workerProps) ->
    dispatchingUrl = @genRandomListenPort()
    @state.outboundAdapters.push adapters.outboundAdapter("lb_socket", { targetActorAid: @workersAlias, owner: @, url: dispatchingUrl })
    #@state.inboundAdapters.push adapters.inboundAdapter("lb_socket", { owner: @, url: dispatchingUrl })
    for i in [1..workerProps.nb]
      @log "debug", "Adding a new worker #{i}"
      @createChild workerProps.type, workerProps.method, actor: "worker#{i}", inboundAdapters: [ { type: "lb_socket", url: dispatchingUrl }, { type: "socket", url: @genRandomListenPort() }], #{type: "channel", url: "tcp://*:2998"} ]

  receive: (message) ->
    @log "Dispatcher received a message to send to workers: #{JSON.stringify(message)}"
    loadBalancing = Math.floor(Math.random() * @nbWorkers) + 1
    sender = message.publisher
    msg = @buildMessage("#{@actor}/worker#{loadBalancing}", message.type, message.payload)
    msg.publisher = sender
    @send msg

exports.Dispatcher = Dispatcher
exports.newActor = (props) ->
  new Dispatcher(props)