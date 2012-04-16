# Hubiquitus-node

Hubiquitus-node is a Node.JS project that links a client that wants to perform
Publish-Subscribe operations to a XMPP Server. It allows the client to use 
WebSockets or BOSH to connect and lets him abstract the underlying structure
used by XMPP by only requiring the essential information to perform each action.

## Features

* Can be run separately from the XMPP Server, allowing more flexibility.

* Clients can connect using WebSockets or BOSH, allowing to use the best 
transport for the client type.

* By using **HubiquitusJS** you can simplify the treatment of messages sent
and let **Hubiquitus-Node** take care of the rest.

* Several ports can be used for each transport, each running as a different
process increasing scalability!

## How to Install

To use **Hubiquitus-Node**, you need Node.JS and NPM.

```
$ npm install git://github.com/hubiquitus/hubiquitus-node.git	
```

## How to use

Once installed, all you need to do is run *hnode.js*:

```	
$ ./hnode.js
```

If you installed it globally (using 
`npm install -g git://github.com/hubiquitus/hubiquitus-node.git`)
you can run it with `$ hubiquitus-node`

When launched, the server waits for requests by all available transports
in all defined ports.

This server needs a hAPI counterpart (ported to different languages),
for example [hubiquitusjs](https://github.com/hubiquitus/hubiquitusjs).

### Configuring

There are two ways to configure **Hubiquitus-Node**, you can pass command-line
arguments when running it or use a config file. The options, their format, 
their default values and their explanation can all be found in *lib/options.js*.

* Command-line arguments are always in the format `--option value`.

* Config files are comprised of key-values pairs in the format `key = value`.

```
Note: Blank lines or lines starting with '#' are ignored. 
Keys accepting arrays are specified by passing value1,value2,value3
```

## License 

Copyright (c) Novedia Group 2012.

This file is part of Hubiquitus.

Hubiquitus is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

Hubiquitus is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with Hubiquitus.  If not, see <http://www.gnu.org/licenses/>.
