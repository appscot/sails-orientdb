"use strict";

var utils = require('../utils'),
    Document = require('./document'),
    log = require('debug-logger')('waterline-orientdb:edge');

/**
 * Manage An Edge
 *
 * @param {Object}      definition
 * @param {Connection}  connection
 * @api public
 */
var Edge = module.exports = utils.extend(Document, function() {
  Document.apply(this, arguments);
  
  // Set the orientdb super class ('document' / V / E) for this document
  this.superClass = 'E';
  
  // Set a class command that will be passed to Oriento ( 'undefined' / VERTEX / EDGE)
  this.classCommand = 'EDGE';
  
  // Information about edge's in and out properties
  this.edgeSides = null;
  
  this._getEdgeSides();
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



/////////////////////////////////////////////////////////////////////////////////
// PRIVATE METHODS
/////////////////////////////////////////////////////////////////////////////////

/**
 * Get edge sides
 *
 * Returns and object describing the out and the in sides of the edge
 *
 * @param {Object} collectionName
 * @return {Object}
 * @api private
 */
Edge.prototype._getEdgeSides = function _getEdgeSides() {
  var self = this,
      vertexA,
      vertexB;
      
  Object.keys(self.schema).forEach(function(key) {
    var reference = self.schema[key].model || self.schema[key].references;
    if(!reference)
      return;
      
    var referencedCollection = self.connection.collectionsByIdentity[reference];
    var referencedSchema = referencedCollection.attributes;
    
    var referencedAttributeKey;
    Object.keys(referencedSchema).forEach(function(referencedSchemaKey) {
      var attribute = referencedSchema[referencedSchemaKey];
      if(attribute.through === self.identity && attribute.via === key)
        referencedAttributeKey = referencedSchemaKey;
    });
    if(!referencedAttributeKey){
        Object.keys(referencedSchema).forEach(function(referencedSchemaKey) {
        var attribute = referencedSchema[referencedSchemaKey];
        // Optimistic attribute assignment...
        if(attribute.through === self.identity)
          referencedAttributeKey = referencedSchemaKey;
      });
    }
    if(!referencedAttributeKey)
      return;
      
    var referencedAttribute = referencedSchema[referencedAttributeKey];
    
    var vertex = {
      referencedCollectionName: reference,
      referencedCollectionTableName: referencedCollection.tableName || reference,
      referencedAttributeKey: referencedAttributeKey,
      referencedAttributeColumnName: referencedAttribute.columnName || referencedAttributeKey,
      dominant: referencedAttribute.dominant,
      junctionTableKey: key,
      junctionTableColumnName: self.schema[key].columnName || key
    };
    
    if(!vertexA)
      vertexA = vertex;
    else if(!vertexB)
      vertexB = vertex;
    else
      log.error('Too many associations! Unable to process model [' + self.identity + '] attribute [' + key + '].');
  });
  
  if(!vertexA.dominant && !vertexB.dominant){
    var dominantVertex = (vertexA.junctionTableKey < vertexB.junctionTableKey) ? vertexA : vertexB;
    dominantVertex.dominant = true;
    
    log.warn(self.identity + ' junction table associations [' + vertexA.referencedCollectionName +
      ', ' + vertexB.referencedCollectionName + '] have no dominant through association. ' +
      dominantVertex.junctionTableKey +
      ' was chosen as dominant.');
  }
  
  if(vertexA.dominant){
    vertexA.referencedAttributeEdge = 'out_' + self.tableName;
    vertexA.edgeOppositeEnd = 'in';
    vertexB.referencedAttributeEdge = 'in_' + self.tableName;
    vertexB.edgeOppositeEnd = 'out';
    self.edgeSides = { out: vertexA, in: vertexB };
    return;
  }

  if(vertexB.dominant){
    vertexA.referencedAttributeEdge = 'in_' + self.tableName;
    vertexA.edgeOppositeEnd = 'out';
    vertexB.referencedAttributeEdge = 'out_' + self.tableName;
    vertexB.edgeOppositeEnd = 'in';
    self.edgeSides = { out: vertexB, in: vertexA };
  }
};

