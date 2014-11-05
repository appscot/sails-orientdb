
/**
 * Module Dependencies
 */
var _ = require('lodash'),
    async = require('async');

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
    
    console.log('createNestedAssociations, value: ' + require('util').inspect(nestedAssociations[key]));

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

