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

var should = require('should');

describe('jid Tests', function(){
    var checkJID = require('../lib/validators.js').validateJID;
    var splitJID = require('../lib/validators.js').splitJID;
    var compJID = require('../lib/validators.js').compareJIDs;
    var getBareJID = require('../lib/validators.js').getBareJID;

    it('should accept jid a@b', function(){
        checkJID('a@b').should.be.true;
    })

    it('should accept jid a-b.*+#c_d@a-b.c_d', function(){
        checkJID('a-b.*+#c_d_d@a-b.c_d').should.be.true;
    })

    it('should accept jid a-b.*+#c_d@a-b.c_d/a-b.c_d', function(){
        checkJID('a-b.*+#c_d@a-b.c_d/a-b.c_d').should.be.true;
    })

    it('should accept jid with accents in username', function(){
        checkJID('a-béàíóú.*+#c_d@a-b.c_d/a-b.c_d').should.be.true;
    })

    it('should not accept jid with two slashes in resource', function(){
        checkJID('a@b/a/a').should.be.false;
    })

    it('should not accept jid without domain', function(){
        checkJID('a').should.be.false;
    })

    it('should not accept jid without username', function(){
        checkJID('@a').should.be.false;
    })

    it('should not accept jid only with resource', function(){
        checkJID('/a').should.be.false;
    })

    it('should split in three parts a jid in the form a@b/c', function(){
        var user = 'asd*-+123',
            domain = 'zxcasc.asc*-+',
            resource = '+-zzxc-.,*+';

        var jid = splitJID(user + '@' + domain + '/' + resource);
        jid.should.have.length(3);
        jid[0].should.be.eql(user);
        jid[1].should.be.eql(domain);
        jid[2].should.be.eql(resource);
    })

    it('should split a jid in the form a@b', function(){
        var user = 'asd*-+123',
            domain = 'zxcasc.asc*-+';

        var jid = splitJID(user + '@' + domain);
        jid.should.have.length(3);
        jid[0].should.be.eql(user);
        jid[1].should.be.eql(domain);
    })

    it('should compare to true two jid with different resource', function(){
        var user = 'asd*-+123',
            domain = 'zxcasc.asc*-+',
            resource1 = '+-zzxc-.,*+',
            resource2 = 'asd45zxc';

        compJID(user + '@' + domain + '/' + resource1, user + '@' + domain + '/' + resource2).should.be.true;
    })

    it('should compare to false two jid with different resource if "r" is active', function(){
        var user = 'asd*-+123',
            domain = 'zxcasc.asc*-+',
            resource1 = '+-zzxc-.,*+',
            resource2 = 'asd45zxc';

        compJID(user + '@' + domain + '/' + resource1, user + '@' + domain + '/' + resource2, 'r').should.be.false;
    })

    it('should get bare JID from a JID with resource', function(){
        var user = 'asd*-+123',
            domain = 'zxcasc.asc*-+',
            resource = '+-zzxc-.,*+';

        getBareJID(user + '@' + domain + '/' + resource).should.be.eql(user + '@' + domain);
    })

    it('should get bare JID from a JID without resource', function(){
        var user = 'asd*-+123',
            domain = 'zxcasc.asc*-+';

        getBareJID(user + '@' + domain).should.be.eql(user + '@' + domain);
    })
})

