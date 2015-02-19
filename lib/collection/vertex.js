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
//var Vertex = 
module.exports = utils.extend(Document, function() {
  Document.apply(this, arguments);
  
  // Set the orientdb super class ('document' / V / E) for this document
  this.superClass = 'V';
  
  // Set a class command that will be passed to Oriento ( 'undefined' / VERTEX / EDGE)
  this.classCommand = 'VERTEX';
});
