"use strict";

var utils = require('../utils'),
    Document = require('./document');

/**
 * Manage A Vertex
 *
 * @param {Object}      definition
 * @param {Connection}  connection
 * @api public
 */
var Vertex = module.exports = utils.extend(Document, function() {
  Document.apply(this, arguments);
  this.superClass = 'V';
  this.classCommand = 'VERTEX';
});
