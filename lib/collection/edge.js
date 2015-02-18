"use strict";

var utils = require('../utils'),
    Document = require('./document');

/**
 * Manage An Edge
 *
 * @param {Object}      definition
 * @param {Connection}  connection
 * @api public
 */
var Edge = module.exports = utils.extend(Document, function() {
  Document.apply(this, arguments);
  this.superClass = 'E';
});
