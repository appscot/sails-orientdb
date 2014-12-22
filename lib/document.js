
/**
 * Module Dependencies
 */
var _ = require('lodash'),
    RID = require('oriento').RID,
    utils = require('./utils'),
    hasOwnProperty = utils.object.hasOwnProperty,
    log = require('debug-logger')('waterline-orientdb:document');

/**
 * Document
 *
 * Represents a single document in a collection. Responsible for serializing values before
 * writing to a collection.
 *
 * @param {Object} values
 * @param {Object} schema
 * @api private
 */

var Document = module.exports = function Document(values, schema) {

  // Keep track of the current document's values
  this.values = {};

  // Grab the schema for normalizing values
  this.schema = schema || {};
  
  // Nested associations that require creating documents
  this.nestedAssociations = null;

  // If values were passed in, use the setter
  if(values){
    var newValues = this.setValues(values);
    this.values = newValues.values;
    this.nestedAssociations = newValues.nestedAssociations;
  } 

  return this;
};


/**
 * Set Foreign Keys
 *
 * @param {Object} values
 * @return {Object}
 * @api public
 */

Document.prototype.setForeignKeys = function setForeignKeys(values) {
  if(!values)
  	return;
  
  for(key in values){
  	this.values[key] = values[key];
  }
};


/////////////////////////////////////////////////////////////////////////////////
// PRIVATE METHODS
/////////////////////////////////////////////////////////////////////////////////


/**
 * Set values
 *
 * Normalizes values into proper formats.
 *
 * @param {Object} values
 * @return {Object}
 * @api private
 */

Document.prototype.setValues = function setValues(values) {
  var results = this.serializeValues(values);
  this.normalizeId(results.values);

  return results;
};


/**
 * Normalize ID's
 *
 * Moves values.id into the preferred orientDB @rid field.
 *
 * @param {Object} values
 * @api private
 */
Document.prototype.normalizeId = function normalizeId(values) {

  if(!values.id) return;

  // Check if data.id looks like a RecordID
  if(_.isString(values.id) && utils.matchRecordId(values.id)) {
    values.id = new RID(values.id);
  }

  values['@rid'] = _.cloneDeep(values.id);
  delete values.id;
};


/**
 * Serialize Insert Values
 *
 * @param {Object} values
 * @return {Object}
 * @api private
 */
Document.prototype.serializeValues = function serializeValues(values) {
  var self = this;
  var returnResult = {};

  Object.keys(values).forEach(function(key) {
    var schemaKey = key;
    if (!hasOwnProperty(self.schema, key)) {
      // only return if key is not a columnName
      var isColumnName = false;
      Object.keys(self.schema).forEach(function(attributeName) {
        if (self.schema[attributeName].columnName === key) {
          schemaKey = attributeName;
          isColumnName = true;
        }
      });
      if (!isColumnName)
        return;
    }

    var type = self.schema[schemaKey].type,
        val;

    var foreignKey = self.schema[schemaKey].foreignKey || false;

    if (_.isUndefined(values[key]))
      return;


    // If a foreignKey, check if value matches a orientDB id and if so turn it into an recordId
    if (foreignKey && utils.matchRecordId(values[key])) {
      values[key] = new RID(values[key]);
    }
    else if ((self.schema[schemaKey].model || self.schema[schemaKey].collection) && utils.matchRecordId(values[key])) {
      values[key] = new RID(values[key]);
    } 
    else if ((self.schema[schemaKey].model || self.schema[schemaKey].collection) && typeof values[key] === 'object') {
      if (_.isArray(values[key])) {
        var reducedValues = _.reduce(values[key], function(accumulator, item){
          if (utils.matchRecordId(item)){
            accumulator.values.push(new RID(item));
            return accumulator;
          }
          accumulator.nestedAssociations.push(item);
          return accumulator;
        }, { values: [], nestedAssociations: [] });
        
        if (reducedValues.values.length > 0)
          values[key] = reducedValues.values;
        else
          delete values[key];
          
        if(reducedValues.nestedAssociations.length == 0)
          return;
        
        self.addNestedAssociation(returnResult, key, reducedValues.nestedAssociations, self.schema[schemaKey].model || self.schema[schemaKey].collection);
      } 
      else if (_.isPlainObject(values[key])) {
        // Not sure if this scenario is possible
        self.addNestedAssociation(returnResult, key, values[key], self.schema[schemaKey].model || self.schema[schemaKey].collection);
        delete values[key];
      }
    }
    else if(foreignKey || self.schema[schemaKey].model || self.schema[schemaKey].collection) {
      // doesn't match a orientDB id, invalid fKey. Let's suppress it as Waterline does not expect an error
      log.warn('Nullifying [' + key + '] as original value is undefined and Waterline does not expect an error.');
      values[key] = null;
    }


    if (type === 'json') {
      try {
        val = JSON.parse(values[key]);
      } catch(e) {
        return;
      }
      values[key] = val;
    }
  }); 

  returnResult.values = values;

  return returnResult;
};


/**
 * Add Nested objects
 *
 * @param {String} key
 * @param {Object} key
 * @param {String} collection
 * @api private
 */
Document.prototype.addNestedAssociation = function addNestedAssociation(returnResult, key, value, collection) {
  var self = this;
  
  returnResult.nestedAssociations = returnResult.nestedAssociations || {};
  returnResult.nestedAssociations[key] = {
    values : value,
    collection : collection
  };
};


/**
 * Add ForeignKeys
 *
 * Adds foreign keys of nested objects to Values
 *
 * @param {Object} values
 * @api private
 */
Document.prototype.addForeignKeys = function addForeignKeys(foreignKeys) {
  var self = this;
  
  for(key in foreignKeys){
    if(_.isArray(foreignKeys[key])){
      self.values[key] = self.values[key] || [];
      foreignKeys[key].forEach(function(item){
        self.values[key].push(new RID(item));
      });
    } else {
      self.values[key] = new RID(foreignKeys[key]);
    }
  }
};
