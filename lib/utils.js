
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
  var isModelsArray = models instanceof Array;
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
 * Remove foreignKeys from array
 *
 * @param {Array} array
 * @api public
 */
exports.removeForeignKeys = function removeForeignKeys(array) {
  if (!_.isArray(array)) return;
  var self = this;
  
  var total = array.length;
  for(var i=total-1; i>=0; i--){
   if(self.matchRecordId(array[i])){
     array.splice(i, 1);
   }
  }
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
