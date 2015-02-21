"use strict";

var _ = require('lodash'),
    utils = require('../utils'),
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
  
  this._getEdgeSides(arguments[0], arguments[3]);
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
  
  var edge = self._getEdge(self.tableName, criteria.where);
  
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
  
  var edge = self._getEdge(self.tableName, values);
  
  if (edge) {
    // Create edge
    values['@class'] = self.tableName;
    edge.keys.forEach(function(refKey) { delete values[refKey]; });
    return self.connection.createEdge(edge.from, edge.to, values, cb);
  }
  
  // creating an edge without connecting it, probably not useful
  self.$super.prototype.insert.call(self, values, cb);
};


/**
 * Destroy Documents
 *
 * @param {Object} criteria
 * @param {Function} callback
 * @api public
 */
Edge.prototype.destroy = function destroy(criteria, cb) {
  var self = this;
  cb = cb || _.noop;
  
  // TODO: should be in a transaction
  self.connection.find(self.tableName, criteria, function(err, results){
    if(err){ return cb(err); }
    
    if(results.length === 0){ return cb(null, results); }
    
    var rids = _.pluck(results, 'id');
    log.debug('Destroy rids: ' + rids);
    
    self.connection.db.delete(self.classCommand)
      .where('@rid in [' + rids.join(',') + ']')
      .one()
      .then(function (count) {
        if(parseInt(count) !== rids.length){
          return cb(new Error('Deleted count [' + count + '] does not match rids length [' + rids.length +
            '], some vertices may not have been deleted'));
        }
        cb(null, results);
      })
      .error(cb);
  });
};


//Deletes a collection from database
Edge.prototype.drop = function (relations, cb) {
  var self = this;
  
  // If class doesn't exist don't delete records
  if(!self.databaseClass){
    return self.$super.prototype.drop.call(self, relations, cb);
  }
  
  self.connection.db.delete(self.classCommand, self.tableName).one()
    .then(function (count) {
      log.debug('Drop [' + self.tableName + '], deleted records: ' + count);
      self.$super.prototype.drop.call(self, relations, cb);
    })
    .error(cb);
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
Edge.prototype._getEdgeSides = function _getEdgeSides(definition, collectionsByIdentity) {
  var self = this,
      vertexA,
      vertexB;
      
  Object.keys(self.schema).forEach(function(key) {
    var reference = self.schema[key].model || self.schema[key].references;
    if(!reference)
      return;
      
    var referencedCollection = collectionsByIdentity[reference];
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
  
  if(!vertexA){
    if(definition.junctionTable){
      log.warn('No vertexes found for edge [' + self.tableName + '] and this edge is marked as waterline junction ' +
        'table. Association operations referenced by this edge will probably fail. Please check your schema.');
    } else {
      log.info('No vertexes found for edge [' + self.tableName + '].');
    }
    return;
  }
  
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


/**
 * Get edge
 *
 * Normalizes data for edge creation
 *
 * @param {Object} values
 * @return {Object}
 * @api private
 */
Edge.prototype._getEdge = function _getEdge(collectionName, values) {
  var self = this;
  return {
    from : values && values[self.edgeSides.out.junctionTableColumnName],
    to : values && values[self.edgeSides.in.junctionTableColumnName],
    keys: [self.edgeSides.out.junctionTableColumnName, self.edgeSides.in.junctionTableColumnName]
  };
}; 
