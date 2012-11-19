/*
 * Copyright (c) Novedia Group 2012.
 *
 *    This file is part of Hubiquitus
 *
 *    Permission is hereby granted, free of charge, to any person obtaining a copy
 *    of this software and associated documentation files (the "Software"), to deal
 *    in the Software without restriction, including without limitation the rights
 *    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
 *    of the Software, and to permit persons to whom the Software is furnished to do so,
 *    subject to the following conditions:
 *
 *    The above copyright notice and this permission notice shall be included in all copies
 *    or substantial portions of the Software.
 *
 *    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
 *    INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
 *    PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE
 *    FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
 *    ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 *
 *    You should have received a copy of the MIT License along with Hubiquitus.
 *    If not, see <http://opensource.org/licenses/mit-license.php>.
 */

require('should');
var fs = require('fs');


describe('Options Parsing', function(){

    beforeEach(function(){
        process.argv = ['node', 'hnode.js'];
    })

    it('should get default options if nothing specified', function(done){
        var options = require('../lib/options.js').options;
        options.should.be.a('object');
        options.should.have.property('global.loglevel', 'WARN');
        options.should.have.property('socket.io.ports').with.lengthOf(1);
        options.should.have.property('socket.io.namespace', '');
        done();
    })

    it('should change an option when a new one is specified', function(done){
        var i = 2;
        process.argv[i++] = '--global.loglevel';
        process.argv[i++] = 'INFO';

        var options = require('../lib/options.js').createOptions();
        options.should.be.a('object');
        options.should.have.property('global.loglevel', 'INFO');
        done();
    })

    it('should load options from file', function(done){
        process.argv[2] = '--config';
        process.argv[3] = '/tmp/slod.config';

        var fd = fs.openSync('/tmp/slod.config', 'w');
        fs.writeSync(fd, 'socket.io.ports = 3214,1241');

        var options = require('../lib/options.js').createOptions()
        options.should.be.a('object');
        options.should.have.property('socket.io.ports').with.lengthOf(2);
        options.should.have.property('socket.io.ports').and.eql([3214,1241]);
        done();
    })

    it('should convert overrided option to array when needed', function(done){
        var i = 2;
        process.argv[i++] = '--socket.io.ports';
        process.argv[i++] = '1111,2222';

        var options = require('../lib/options.js').createOptions()
        options.should.be.a('object');
        options.should.have.property('socket.io.ports').with.lengthOf(2);
        done();
    })

    it('should convert overrided option to int arrays when needed', function(done){
        var i = 2;
        process.argv[i++] = '--socket.io.ports';
        process.argv[i++] = '1111,2222';

        var options = require('../lib/options.js').createOptions()
        options.should.be.a('object');
        options.should.have.property('socket.io.ports');
        options['socket.io.ports'].map(function(el){
            el.should.be.a('number');
        });
        done();
    })
})
