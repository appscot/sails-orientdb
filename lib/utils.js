
/**
 * Module Dependencies
 */

var _ = require('lodash'),
    RecordId = require('oriento').RID,
    url = require('url');

/**
 * ignore
 */

exports.object = {};


/**
 * Safer helper for hasOwnProperty checks
 *
 * @param {Object} obj
 * @param {String} prop
 * @return {Boolean}
 * @api public
 */
var hop = Object.prototype.hasOwnProperty;
exports.object.hasOwnProperty = function(obj, prop) {
  return hop.call(obj, prop);
};


/**
 * Re-Write OrientDB's @rid attribute to a normalized id attribute
 *
 * @param {Array} models
 * @api public
 */
exports.rewriteIds = function rewriteIds(models, schema) {
  var self = this;
  var isModelsArray = _.isArray(models);
  var models_aux = isModelsArray ? models : [models];
  
  var _models = models_aux.map(function(model) {
    if(!model)
      return model;
    
    if(hop.call(model, '@rid')) {
      // change id to string only if it's necessary
      if(typeof model['@rid'] === 'object')
        model.id = model['@rid'].toString();
      else
        model.id = model['@rid'];
      delete model['@rid'];
    }
    
    // Rewrite any foreign keys if a schema is available
    if(!schema) return model;
    
    Object.keys(schema).forEach(function(key) {
      var foreignKey = schema[key].foreignKey || schema[key].model || false;
      var columnName = schema[key].columnName || false;

      // If a foreignKey, check if value matches an Orient DB Record id and if so turn it into a string
      if(foreignKey){
         if(model[key] instanceof RecordId) {
          model[key] = model[key].toString();
        }
        else if(columnName && model[columnName] instanceof RecordId){
          model[columnName] = model[columnName].toString();
        }
        // Cases where an attribute is foreignKey but is not a model nor a reference
        else if(_.isObject(model[key]) && !schema[key].model && !schema[key].references && !schema[key].collection){
          model[key] = self.rewriteIds(model[key]);
        }
        else if(columnName && _.isObject(model[columnName]) && !schema[key].model && !schema[key].references && !schema[key].collection){
          model[columnName] = self.rewriteIds(model[columnName]);
        }
      }
    });
    
    return model;
  });

  return isModelsArray ? _models : _models[0];
};


/**
 * Check if an ID resembles an OrientDB Record ID.
 *
 * @param {String} id
 * @return {Boolean}
 * @api public
 */
exports.matchRecordId = function matchRecordId(id) {
  if (id === null) return false;
  var test = _.cloneDeep(id);
  if(typeof test.toString !== 'undefined')
    test = id.toString();
  return test.match(/^\#\-?\d+\:\d+$/) ? true : false;
};

/**
 * Check if a collection is a Junction Table Through.
 *
 * @param {String} id
 * @return {Boolean}
 * @api public
 */
exports.isJunctionTableThrough = function isJunctionTableThrough(collection) {
  if(!collection.junctionTable)
    return false;
    
  if(collection.tables)
    return false;
    
  if (collection.identity && collection.tableName && collection.identity !== collection.tableName)
    return true;
  
  var name = collection.identity || collection.tableName;
  return name.match(/^\w+_\w+__\w+_\w+$/) ? false : true;
};

/**
 * Cleans a record from edges or attributes starting with @
 *
 * @param {Array} model
 * @param {Object} schema
 * @api public
 * 
 * 
 */
exports.cleanOrientAttributes = function cleanOrientAttributes(model, schema) {
  if (!model || !_.isObject(model))
    return;
  
  var self = this;
  Object.keys(model).forEach(function(key) {
    // orientdb special attributes
    if(key[0] ==='@'){
      delete model[key];
      return;
    }
    
    // inbound or outbound edge
    if(key.slice(0, 3) === 'in_' || key.slice(0, 4) === 'out_'){
      var relevantSide = key.slice(0, 3) === 'in_' ? 'out' : 'in';
      // legitimate object
      if(schema[key]) 
        return;
      
      // edge is not expanded
      if(!_.isObject(model[key])){
        delete model[key];
        return;
      }
        
      var joinTableName = key.slice(key.indexOf('_') + 1);
      for (attributeName in schema){
        // TODO: if join table has a tableName different from identity, this will not work!
        // Dominant attribute could also be relevant in case the model points to itself
        console.log('cleanOrientAttributes, joinTableName: ' + joinTableName + ', key: ' + key);
        if(schema[attributeName].through === joinTableName && !model[attributeName]){
          model[attributeName] = self.getForeignKeys(model[key], relevantSide);
          break;
        }
      }
      delete model[key];
    }
    
  });
};


/**
 * Takes an edge or array of edges and returns the ID(s) of of the vertices pointed to
 *
 * @param {Object} side
 * @param {Object} side
 * @api public
 */
exports.getForeignKeys = function getForeignKeys(edge, side) {
  if(!_.isArray(edge)){
    var foreignKey = edge[side]['@rid'] || edge[side];
    return [ foreignKey ];
    }  
  
  var vertices = _.pluck(edge, side);
  if(!_.isObject(vertices[0]))
    return vertices;
  
  // Cleans some rogue edges
  vertices = _.filter(vertices, function(vertex){
    return vertex && _.isObject(vertex);
  });
  
  console.log('\n!!! vertices: ' + require('util').inspect(vertices) + '!!!\n');
  return _.pluck(vertices, '@rid');
};


/**
 * Prints collection properties
 *
 * @param {Object} collection
 * @api public
 */
exports.inspectCollection = function inspectCollection(collection) {
  var name = collection.identity || collection.tableName;
  console.log('Details of ' + name + ':');
  var collectionKey;
  for (collectionKey in collection) {
    if (collection[collectionKey] 
      && !_.isFunction(collection[collectionKey])
      && ['waterline', 'connections', 'query', '_schema', '_callbacks', 'adapter'].indexOf(collectionKey) === -1) {
      console.log(' - ' + collectionKey + ': ' + require('util').inspect(collection[collectionKey]));
    }
  }
}; 
