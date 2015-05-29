"use strict";

var _ = require('lodash'),
    utils = require('../utils'),
    Query = require('../query'),
    Document = require('./document'),
    Record = require('../record'),
    log = require('debug-logger')('sails-orientdb:edge');

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
  
  this._getEdgeSides(arguments[0], arguments[2]);
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
  var _query, query;
  
  try {
    _query = new Query(criteria, self.connection);
    
    // Replace junction foreign key columns for in and out
    query = _query.getSelectQuery(self.tableNameOriginal, self.schema);
    Object.keys(self.edgeSides).forEach(function(key){
      var junctionColumnName = self.edgeSides[key].junctionTableColumnName;
      query.query[0] = query.query[0].replace(junctionColumnName, key + ' AS ' + junctionColumnName);
    });
    query.query[0] = query.query[0].replace('SELECT ', '');
    query.query[0] = query.query[0].split('FROM')[0];
    criteria.select = [query.query[0]];
  } catch(e) {
    log.error('Failed to compose find SQL query.', e);
    return cb(e);
  }
  
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
    log.debug('Insert into [' + self.tableName + '] values:', values);
    values['@class'] = self.tableName;
    var record = new Record(values, self.schema, self.connection, 'insert');
    edge.keys.forEach(function(refKey) { delete values[refKey]; });
    return self.connection.createEdge(edge.from, edge.to, record.values, cb);
  }
  
  // creating an edge without connecting it, probably an edge created with orientdbClass = 'E',
  // or some manual operation
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
  if(criteria.select && criteria.select.indexOf('id') < 0){
    criteria.select.push('id');
  } else {
    criteria.select = ['*'];
  }
  self.find(criteria, function(err, results){
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
Edge.prototype._getEdgeSides = function _getEdgeSides(definition, collectionsById) {
  collectionsById = collectionsById || {};
  var self = this,
      vertexA,
      vertexB;
      
  log.debug('_getEdgeSides: finding vertexes for: ' + self.tableName);
  
  Object.keys(self.schema).forEach(function(key) {
    var reference = self.schema[key].references;
    if(!reference)
      return;
      
    var referencedCollection = _.find(_.values(self.connection.waterlineSchema), { identity: reference });
    var referencedSchema = referencedCollection.attributes;
    var referencedDefinition = collectionsById[reference];
    var referencedAttributes = referencedDefinition.attributes;
    
    var referencedAttributeKey;
    Object.keys(referencedSchema).forEach(function(referencedSchemaKey) {
      var attribute = referencedSchema[referencedSchemaKey];
      if(self.identity === attribute.collection && (key === attribute.on || key === attribute.via)){
        if(!referencedAttributeKey){
          log.debug('_getEdgeSides: match found for ' + key + ': ' + referencedSchemaKey);
          referencedAttributeKey = referencedSchemaKey;
        }
        else {
          // More than one match, let's use via
          // Logic for collections with associations to themselves
          if(key === attribute.via){
            log.debug('_getEdgeSides: match found for ' + key + ': ' + referencedSchemaKey);
            referencedAttributeKey = referencedSchemaKey;
          }
        }
      }
    });
    if(!referencedAttributeKey){
      return;
    }
      
    var referencedAttribute = referencedSchema[referencedAttributeKey];
    
    // we need referencedOriginalAttribute because referencedAttribute not always has dominant attribute
    var referencedOriginalAttribute = referencedAttributes[referencedAttributeKey];
    
    var vertex = {
      referencedCollectionName: reference,
      referencedCollectionTableName: referencedCollection.tableName || reference,
      referencedAttributeKey: referencedAttributeKey,
      referencedAttributeColumnName: referencedAttribute.columnName || referencedAttributeKey,
      dominant: referencedAttribute.dominant || referencedOriginalAttribute.dominant,
      junctionTableKey: key,
      junctionTableColumnName: self.schema[key].columnName || key
    };
    
    if(vertex.dominant && (referencedOriginalAttribute.joinTableName || referencedOriginalAttribute.edge)){
      self.tableName = referencedOriginalAttribute.joinTableName || referencedOriginalAttribute.edge;
      log.info('Edge [' + self.identity + '] has changed its tableName to [' + self.tableName + ']');
    } else if(vertex.dominant && referencedDefinition.joinTableNames &&
      referencedDefinition.joinTableNames[referencedAttributeKey]){
      self.tableName = referencedDefinition.joinTableNames[referencedAttributeKey];
      log.info('Edge [' + self.identity + '] has changed its tableName to [' + self.tableName + ']');
    }
    
    if(!vertexA)
      vertexA = vertex;
    else if(!vertexB)
      vertexB = vertex;
    else
      log.error('Too many associations! Unable to process model [' + self.identity + '] attribute [' + key + '].');
  });
  
  if(!vertexA || !vertexB){
    if(definition.junctionTable){
      log.warn('Vertex(es) missing for edge [' + self.tableName + '] and this edge is marked as waterline junction ' +
        'table. Association operations referenced by this edge will probably fail. Please check your schema.');
    } else {
      log.info('Vertex(es) missing for edge [' + self.tableName + '].');
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
