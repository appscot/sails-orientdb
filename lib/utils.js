
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
 * @param {Array|Object}  models
 * @param {Object}        schema
 * @param {Boolean}       recursive defaults to true
 * @param {Object}        accumulator, used by recursive call as protection against circular references
 * @api public
 */
exports.rewriteIds = function rewriteIds(models, schema, recursive, accumulator) {
  var self = this;
  var isModelsArray = _.isArray(models);
  var models_aux = isModelsArray ? models : [models];
  var recursive = typeof recursive === 'undefined' ? true : recursive;
  var accumulator = accumulator || {};
  
  var _models = models_aux.map(function(model) {
    if(!_.isObject(model))
      return model;
      
    if(model.id && accumulator[model.id])
      return model;  // already processed, circular reference
    
    if(hop.call(model, '@rid')) {
      // change id to string only if it's necessary
      if(typeof model['@rid'] === 'object')
        model.id = model['@rid'].toString();
      else
        model.id = model['@rid'];
      delete model['@rid'];
    }
    accumulator[model.id] = true;
    
    // Rewrite any foreign keys if a schema is available
    if(schema){
      
      Object.keys(schema).forEach(function(key) {
        var foreignKey = schema[key].foreignKey || schema[key].model || false;
        var columnName = schema[key].columnName || key;
  
        // If a foreignKey, check if value matches an Orient DB Record id and if so turn it into a string
        if(foreignKey){
          if(model[columnName] instanceof RecordId){
            model[columnName] = model[columnName].toString();
          }
        }
      });
    }
    
    if(recursive){
      Object.keys(model).forEach(function(key){
        if(_.isObject(model[key])){
          self.rewriteIds(model[key], null, recursive, accumulator);
        }
      });
    }
    
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
 * Reduce nested objects: goes through every object of collection, including nested and root,
 * and runs callback
 *
 * @param   {Object}    collection
 * @param   {function}  callback in the form of function(accumulator, obj, key) { ... return accumulator; }
 * @param   {Object}    accumulator
 * @param   {String}    rootKey
 * @return  {Object}    result
 * @api public
 */
exports.reduceNestedObjects = function reduceNestedObjects(collection, callback, accumulator, rootKey) {
  accumulator = accumulator || {};
  rootKey = rootKey || '_root';
  if(!collection) { return accumulator; }
  
  // parent
  var accu = callback(accumulator, collection, rootKey);
  
  var mapped = _.reduce(collection, function(result, obj, key) {
    if(_.isObject(obj))
      return reduceNestedObjects(obj, callback, result, key);
    return result;
  }, accu);
  
  return mapped;
};


/**
 * For each including nested properties
 *
 * @param   {Object}    collection
 * @param   {function}  callback in the form of function(value, key, parent).
 * @api public
 */
exports.forEachNested = function forEachNested(collection, callback) {
  if(!collection) { return; }
  
  _.forEach(collection, function(value, key, parent) {
    if(_.isObject(value))
      return forEachNested(value, callback);
    return callback(value, key, parent);
  });
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
