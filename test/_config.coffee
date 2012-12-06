user1Jid = 'u1@localhost'
user1Pass = 'u1'

user2Jid = 'u2@localhost'
user2Pass = 'u2'

mongoURI = 'mongodb://localhost/test'

commandsPath = 'lib/hcommands'
commandsTimeout = 5000

# * Don't edit below * #

# * available vars * #
# Available external classes
exports.validators = undefined
exports.codes = undefined
exports.db = undefined
exports.cmdController = undefined

# Available vars
exports.logins = undefined
exports.cmdParams = undefined
exports.mongoURI = undefined
exports.validJID = undefined
exports.validDomain = undefined


# Available functions
exports.makeHMessage = undefined
exports.createChannel = undefined
exports.beforeFN = undefined
exports.afterFN = undefined



###
DO NOT TOUCH BELOW THIS LINE
###


should = require('should')
codes = require('../lib/codes')

validators = require('../lib/validator')
cmdController = require('../lib/hcommand_controller').Controller
winston = require('winston')

db = require('../lib/dbPool').getDbPool().getDb("admin");

exports.validators = validators
exports.db = db
exports.codes = codes
exports.cmdController = cmdController

validJID = 'u1@localhost'

# Array of logins (with params if you want) to connect to XMPP
exports.logins = [
  {
    jid: user1Jid,
    password: user1Pass
  },
  {
    jid: user1Jid + '/testRessource',
    password: user1Pass
  },
  {
    jid: user2Jid,
    password: user1Pass
  },
  {
    jid: user2Jid + '/testRessource',
    password: user1Pass
  }
];

exports.cmdParams = {
  modulePath: commandsPath,
  timeout: commandsTimeout
}

exports.mongoURI = mongoURI

exports.validJID = validJID;

exports.validDomain = exports.validators.getDomainJID(validJID);


exports.makeHMessage = (actor, publisher, type, payload) ->
  hMessage =
    msgid: UUID.generate()
    convid: @msgid
    actor: actor
    type: type
    priority: 0
    publisher: publisher
    published: new Date()
    sent: new Date()
    timeout: 30000
    payload: payload

  hMessage

exports.createChannel = (actor, subscribers, owner, active, done) ->
  payload =
    cmd: "hCreateUpdateChannel"
    params:
      type: "channel"
      actor: actor
      active: active
      owner: owner
      subscribers: subscribers

  exports.makeHMessage(owner, owner, "hCommand", payload)


UUID = ->
UUID.generate = ->
  a = UUID._gri
  b = UUID._ha
  b(a(32), 8) + "-" + b(a(16), 4) + "-" + b(16384 | a(12), 4) + "-" + b(32768 | a(14), 4) + "-" + b(a(48), 12)

UUID._gri = (a) ->
  (if 0 > a then NaN else (if 30 >= a then 0 | Math.random() * (1 << a) else (if 53 >= a then (0 | 1073741824 * Math.random()) + 1073741824 * (0 | Math.random() * (1 << a - 30)) else NaN)))

UUID._ha = (a, b) ->
  c = a.toString(16)
  d = b - c.length
  e = "0"

  while 0 < d
    d & 1 and (c = e + c)
    d >>>= 1
    e += e
  c