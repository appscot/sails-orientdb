
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
      var foreignKey = schema[key].foreignKey || false;

      // If a foreignKey, check if value matches an Orient DB Record id and if so turn it into a string
      if(foreignKey && model[key] instanceof RecordId) {
        model[key] = '#' + model[key].cluster + ':' + model[key].position;
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
