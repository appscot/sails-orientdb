
/**
 * Module Dependencies
 */
var _ = require('lodash'),
    async = require('async'),
    _runJoins = require('waterline-cursor');

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
 * Get edge
 *
 * Normalizes data for edge creation
 *
 * @param {Object} values
 * @return {Object}
 * @api private
 */

Associations.prototype.getEdge = function getEdge(collectionName, values) {
  var self = this,
      collection = this.connection.collections[collectionName],
      schema = collection.attributes,
      identity = collection.identity || collection.tableName,
      from,
      to;
  
  Object.keys(values).forEach(function(key) {
    var schemaKey = key;
    Object.keys(schema).forEach(function(attributeName) {
      if (schema[attributeName].columnName === key)
          schemaKey = attributeName;
    });
    
    var reference = schema[schemaKey].model || schema[schemaKey].references;
    if(!reference)
      return;
      
    var referencedCollection = self.connection.collectionsByIdentity[reference];
    var referencedSchema = referencedCollection.attributes;
    var referencedAttribute = _.find(referencedSchema, function(attribute){
      return attribute.through === identity && attribute.via === schemaKey;
    });
    
    if(!referencedAttribute){
      referencedAttribute = _.find(referencedSchema, function(attribute){
        return attribute.through === identity;
      });
    }
      
    if(!from && referencedAttribute.dominant)
      from = values[key];
    else if(!to)
      to = values[key];
    else if(!from){
      console.log('WARNING: ' + referencedCollection.identity + ' has no dominant through connection.');
      from = values[key];
    } else
      console.log('ERROR: unable to process model [' + identity + '] attribute [' + key + '].');
  });
  
  //TODO: delete the 'from' and 'to' foreign keys from the original values

  return { from: from, to: to};
};
