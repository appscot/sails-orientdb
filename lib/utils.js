
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
exports.rewriteIds = function rewriteIds(models) {
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
    return model;
  });

  return isModelsArray ? _models : _models[0];
};

