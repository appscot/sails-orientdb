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
  this.classCommand = 'EDGE';
});


/////////////////////////////////////////////////////////////////////////////////
// PUBLIC METHODS
/////////////////////////////////////////////////////////////////////////////////

/**
 * Find Edges
 *
 * @param {Object} criteria
 * @param {Function} callback
 * @api public
 */
Edge.prototype.find = function find(criteria, cb) {
  var self = this;
  
  var edge = self.connection.associations.getEdge(self.tableName, criteria.where);
  
  if (edge) {
    // Replace foreign keys with from and to
    if(edge.from) { criteria.where.out = edge.from; }
    if(edge.to)   { criteria.where.in = edge.to; }
    if(criteria.where){
      edge.keys.forEach(function(refKey) { delete criteria.where[refKey]; });
    }
  }
  
  self.$super.prototype.find.call(self, criteria, cb);
};



/**
 * Insert A New Edge
 *
 * @param {Object|Array}  values
 * @param {Function}      callback
 * @api public
 */
Edge.prototype.insert = function insert(values, cb) {
  var self = this;
  
  var edge = self.connection.associations.getEdge(self.tableName, values);
  
  if (edge) {
    // Create edge
    values['@class'] = self.tableName;
    edge.keys.forEach(function(refKey) { delete values[refKey]; });
    return self.connection.createEdge(edge.from, edge.to, values, cb);
  }
  
  // creating an edge without connecting it, probably not useful
  self.$super.prototype.insert.call(self, values, cb);
};


