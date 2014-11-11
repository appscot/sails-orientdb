
/**
 * Module Dependencies
 */
var _ = require('lodash'),
    async = require('async'),
    _runJoins = require('waterline-cursor'),
    utils = require('./utils');

/**
 * Associations
 *
 * Associations contains methods used in implementing Waterline's Associations
 *
 * @param {Object} connection
 * @api private
 */
var Associations = module.exports = function Associations(connection) {

  // A connection to the DB used for queries
  this.connection = connection;
  
  return this;
};


/**
 * Create Nested Associations
 *
 * @param {Object} values
 * @return {Object}
 * @api public
 */
Associations.prototype.createNestedAssociations = function createNestedAssociations(nestedAssociations, callback) {
  var self = this;

  async.reduce(Object.keys(nestedAssociations), {}, function(accumulator, key, next) {
    var value = nestedAssociations[key];
    var data = value.values;
    var collection = self.connection.collectionsByIdentity[value.collection];
    var tableName = collection.tableName || collection.identity;

    if ( !_.isArray(data) ) {
      self.connection.create(tableName, data, function(err, klass) {
        accumulator[key] = klass && klass.id;
        next(err, accumulator);
      });
    } else {
      async.map(data, function(item, complete) {
        self.connection.create(tableName, item, function(err, klass) {
          complete(err, klass && klass.id);
        });
      }, function(err, results) {
        accumulator[key] = results;
        next(err, accumulator);
      });
    }
  }, function(err, result) {
    callback(err, result);
  }); 
};



/**
 * Join call
 * 
 * @param {String} collectionName
 * @param {Object} criteria
 * @param {Function} cb
 * @return {Object}
 * @api public
 * 
 * TODO: identify join table joins and use Edges
 */
Associations.prototype.join = function join(collectionName, criteria, cb) {
  var self = this;
  
  // Ignore `select` from waterline core
  if ( typeof criteria === 'object') {
    delete criteria.select;
  }

  var connectionObject = self.connection;

  // Populate associated records for each parent result
  // (or do them all at once as an optimization, if possible)
  _runJoins({
    
    instructions: criteria,
    parentCollection: collectionName,

    /**
     * Find some records directly (using only this adapter)
     * from the specified collection.
     *
     * @param  {String}   collectionIdentity
     * @param  {Object}   criteria
     * @param  {Function} cb
     */
    $find: function (collectionIdentity, criteria, cb) {
      return connectionObject.find(collectionIdentity, criteria, cb);
    },

    /**
     * Look up the name of the primary key field
     * for the collection with the specified identity.
     *
     * @param  {String}   collectionIdentity
     * @return {String}
     */
    $getPK: function (collectionIdentity) {
      if (!collectionIdentity) return;
      var schema = connectionObject.collections[collectionIdentity].attributes;
      
      if(!schema)
       return 'id'; 
      
      for(key in schema){
        if(schema[key].primaryKey)
          return key;
      }
      return 'id';
    }
  }, cb);

}; 


/**
 * Get edge sides
 *
 * Returns and object describing the out and the in sides of the edge
 *
 * @param {Object} collectionName
 * @return {Object}
 * @api private
 */
Associations.prototype.getEdgeSides = function getEdgeSides(collectionName) {
  var self = this,
      collection = this.connection.collections[collectionName],
      schema = collection.attributes,
      identity = collection.identity || collection.tableName,
      vertexA,
      vertexB;
      
  Object.keys(schema).forEach(function(key) {
    var reference = schema[key].model || schema[key].references;
    if(!reference)
      return;
      
    var referencedCollection = self.connection.collectionsByIdentity[reference];
    var referencedSchema = referencedCollection.attributes;
    
    var referencedAttributeKey;
    Object.keys(referencedSchema).forEach(function(referencedSchemaKey) {
      var attribute = referencedSchema[referencedSchemaKey];
      if(attribute.through === identity && attribute.via === key)
        referencedAttributeKey = referencedSchemaKey;
    });
    if(!referencedAttributeKey){
        Object.keys(referencedSchema).forEach(function(referencedSchemaKey) {
        var attribute = referencedSchema[referencedSchemaKey];
        // Optimistic attribute assignment...
        if(attribute.through === identity)
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
      junctionTableColumnName: schema[key].columnName || key
    };
    
    if(!vertexA)
      vertexA = vertex;
    else if(!vertexB)
      vertexB = vertex;
    else
      console.log('ERROR: too many associations! Unable to process model [' + identity + '] attribute [' + key + '].');
  });
  
  if(!vertexA.dominant && !vertexB.dominant){
    var dominantVertex = (vertexA.junctionTableKey < vertexB.junctionTableKey) ? vertexA : vertexB;
    dominantVertex.dominant = true;
    
    console.log('WARNING: ' + collectionName + ' junction table associations [' + vertexA.referencedCollectionName 
      + ', ' + vertexB.referencedCollectionName + '] have no dominant through association. ' + dominantVertex.junctionTableKey 
      + ' was chosen as dominant.');
  }
  
  if(vertexA.dominant){
    vertexA.referencedAttributeEdge = 'out_' + collectionName;
    vertexB.referencedAttributeEdge = 'in_' + collectionName;
    return { out: vertexA, in: vertexB };
  }

  if(vertexB.dominant){
    vertexA.referencedAttributeEdge = 'in_' + collectionName;
    vertexB.referencedAttributeEdge = 'out_' + collectionName;
    return { out: vertexB, in: vertexA };
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
Associations.prototype.getEdge = function getEdge(collectionName, values) {
  var edgeSides = this.getEdgeSides(collectionName);
  //TODO: delete the 'from' and 'to' foreign keys from the original values
  return { from: values[edgeSides.out.junctionTableColumnName], to: values[edgeSides.in.junctionTableColumnName] };
};


/**
 * Is many-to-many through join
 * 
 * @param {Object} criteria
 * @return {Boolean}
 * @api public
 */
Associations.prototype.isThroughJoin = function isThroughJoin(criteria) {
  var self = this;
  if(!criteria.joins)
    return false;
  
  for(i=0; i < criteria.joins.length; i++){
    var join = criteria.joins[i];
    var collectionInstance = self.connection.collections[join.parent];
    if(utils.isJunctionTableThrough(collectionInstance))
      return true;
  }
  
  return false;
};