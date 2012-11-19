# Hubiquitus-node

Hubiquitus-node is a Node.JS project that links a client that wants to perform
Publish-Subscribe operations to a XMPP Server. It allows the client to use 
WebSockets to connect and lets him abstract the underlying structure
used by XMPP by only requiring the essential information to perform each action.

## Features

* Can be run separately from the XMPP Server, allowing more flexibility.

* Clients can connect using WebSockets, allowing to use the best
transport for the client type.

* By using **HubiquitusJS** you can simplify the treatment of messages sent
and let **Hubiquitus-Node** take care of the rest.

* Several ports can be used for each transport, each running as a different
process increasing scalability!

## How to Install
### Dependencies

To use **Hubiquitus-Node**, you need Node.JS, NPM, mongoDb and an XMPP Server.

To install correctly Node.JS you can use this [link](https://github.com/joyent/node/wiki/Installation)
Note that you need at least v0.6.16

To install correctly XMPP Server you can use for example ejabberd using `sudo apt-get install ejabberd`
Once the installation is complete, you have to add an admin user `sudo ejabberdctl register admin localhost password`
Then acces to the admin pannel at `http://localhost:5280/admin` and add any user you need.

To make it function correctly, the XMPP Server needs to have a `Component connection`
configured.

To install correctly MongoDB database you can use `sudo apt-get install mongodb`

###Installation

```
$ npm install git://github.com/hubiquitus/hubiquitus-node.git	
```

## How to use

Once installed, all you need to do is run *hnode.js* with the `component-jid`
and `secret` as options:

```	
$ ./hnode.js --hnode.jid <jid> --hnode.password <secret>
```

If you installed it globally (using 
`npm install -g git://github.com/hubiquitus/hubiquitus-node.git`)
you can run it with `$ hubiquitus-node --hnode.jid <jid> --hnode.password <secret>`

When launched, the server waits for requests by all available transports
in all defined ports.

This server needs a hAPI counterpart (ported to different languages),
for example [hubiquitusjs](https://github.com/hubiquitus/hubiquitusjs).

### Configuring

There are two ways to configure **Hubiquitus-Node**, you can pass command-line
arguments when running it or use a config file. The options, their format, 
their default values and their explanation can all be found in 
[Options](https://github.com/hubiquitus/hubiquitus-node/wiki/Options-v0.5).

To use a config file you need only to pass one argument: `--config <path>`

* Command-line arguments are always in the format `--option value`.

* Config files are comprised of key-values pairs in the format `key = value`.

```
Note: Blank lines or lines starting with '#' are ignored. 
Keys accepting arrays are specified by passing value1,value2,value3
```

## License 

Copyright (c) Novedia Group 2012.

    This file is part of Hubiquitus

    Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
of the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

    The above copyright notice and this permission notice shall be included in all copies
or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE
FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

    You should have received a copy of the MIT License along with Hubiquitus.
If not, see <http://opensource.org/licenses/mit-license.php>.
