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
errors = require("./codes").errors
codes = require("./codes")
validator = require("./validator")
dbPool = require("./dbPool").db
log = require("winston")

exports.checkFilterFormat = (hCondition) ->
  if not hCondition or (hCondition not instanceof Object)
    return {
      result: false
      error: "the filter is not a valid object"
    }
  next = undefined
  checkFormat = undefined
  if Object.getOwnPropertyNames(hCondition).length is 0
    return {
      result: true
      error: ""
    }

  i = 0
  while i < Object.getOwnPropertyNames(hCondition).length
    switch Object.getOwnPropertyNames(hCondition)[i]
      when "eq", "ne", "gt", "gt", "gte", "lt", "lte", "in", "nin"
        for key of hCondition
          if not hCondition[key] or not(hCondition[key] instanceof Object)
            return {
              result: false
              error: "The attribute of an operand " + key + " must be an object"
            }
      when "and", "or", "nor"
        next = hCondition.and or hCondition.or or hCondition.nor
        if next.length <= 1 or next.length is `undefined`
          return {
            result: false
            error: "The attribute must be an array with at least 2 elements"
          }

        j = 0
        while j < next.length
          checkFormat = exports.checkFilterFormat(next[j])
          if checkFormat.result is false
            return {
              result: false
              error: checkFormat.error
            }
          j++
      when "not"
        if not hCondition.not or not (hCondition.not instanceof Object) or hCondition.not.length isnt `undefined`
          return {
            result: false
            error: "The attribute of an operand \"not\" must be an object"
          }
        checkFormat = exports.checkFilterFormat(hCondition.not)
        if checkFormat.result is false
          return {
            result: false
            error: checkFormat.error
          }
      when "relevant"
        if typeof hCondition.relevant isnt "boolean"
          return {
            result: false
            error: "The attribute of an operand \"relevant\" must be a boolean"
          }
      when "geo"
        if typeof hCondition.geo.lat isnt "number" or typeof hCondition.geo.lng isnt "number" or typeof hCondition.geo.radius isnt "number"
          return {
            result: false
            error: "Attributes of an operand \"geo\" must be numbers"
          }
      when "boolean"
        if typeof hCondition.boolean isnt "boolean"
          return {
            result: false
            error: "The attribute of an operand \"boolean\" must be a boolean"
          }
      else
        return {
          result: false
          error: "A filter must start with a valid operand"
        }
    i++

  return {
    result: true
    error: ""
  }