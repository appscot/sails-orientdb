
/**
 * Module Dependencies
 */

var _ = require('lodash'),
    RID = require('oriento').RID,
    utils = require('./utils'),
    hasOwnProperty = utils.object.hasOwnProperty;

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
  this.nestedAssociations;

  // If values were passed in, use the setter
  if(values) this.values = this.setValues(values);

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
  this.serializeValues(values);
  this.normalizeId(values);

  return values;
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

  Object.keys(values).forEach(function(key) {
  	var schemaKey = key;
    if(!hasOwnProperty(self.schema, key)){
      // only return if key is not a columnName
      var isColumnName = false;
      Object.keys(self.schema).forEach(function(attributeName) {
        if(self.schema[attributeName].columnName === key){
    	  schemaKey = attributeName;
    	  isColumnName = true;
    	}
      });
      if(!isColumnName)
    	return;
    }

  var type = self.schema[schemaKey].type,
    val;

  var foreignKey = self.schema[schemaKey].foreignKey || false;

  if(_.isUndefined(values[key])) return;

  // If a foreignKey, check if value matches a orientDB id and if so turn it into an recordId
  if(foreignKey && utils.matchRecordId(values[key])) {
    values[key] = new RID(values[key]);
    }
    else if((self.schema[schemaKey].model || self.schema[schemaKey].collection) && utils.matchRecordId(values[key])){
        values[key] = new RID(values[key]);
    }

    if(type === 'json') {
      try {
        val = JSON.parse(values[key]);
      } catch(e) {
        return;
      }
      values[key] = val;
    }
  });

  return values;
};