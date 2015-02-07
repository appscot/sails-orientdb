"use strict";
/**
 * Module Dependencies
 */
var _ = require('lodash'),
    RID = require('oriento').RID,
    utils = require('./utils'),
    hop = utils.object.hop,
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

var Document = module.exports = function Document(values, schema, connection) {

  // Keep track of the current document's values
  this.values = {};

  // Grab the schema for normalizing values
  this.schema = schema || {};
  
  // Connection
  this.connection = connection;

  // If values were passed in, use the setter
  if(values){
    var newValues = this.setValues(values);
    this.values = newValues.values;
  } 

  return this;
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

  values['@rid'] = values.id;
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
    if (!hop(self.schema, key)) {
      // only return if key is not a columnName
      var isColumnName = false;
      Object.keys(self.schema).forEach(function(attributeName) {
        if (self.schema[attributeName].columnName === key) {
          schemaKey = attributeName;
          isColumnName = true;
        }
      });
      if (!isColumnName){
        return;
      }
    }

    var type = self.schema[schemaKey].type;

    var foreignKey = self.schema[schemaKey].foreignKey || false;

    if (_.isUndefined(values[key]) || _.isNull(values[key])){
      return;
    }
      
    var targetCollectionName = self.schema[schemaKey].model || self.schema[schemaKey].collection;

    // If a foreignKey, check if value matches a orientDB id and if so turn it into a recordId
    if (foreignKey && utils.matchRecordId(values[key])) {
      values[key] = new RID(values[key]);
    }
    else if (targetCollectionName && utils.matchRecordId(values[key])) {
      values[key] = new RID(values[key]);
    } 
    else if (targetCollectionName && typeof values[key] === 'object') {
      log.warn('Unexpected behaviour: nested association for key [' + key + '], values: ', values[key]);
    }
    else if(targetCollectionName) {
      var targetCollection = self.connection.collectionsByIdentity[targetCollectionName];
      if(targetCollection.primaryKey === 'id'){
        log.warn('Nullifying foreign key [' + key + '] (value: [' + values[key] +
          ']) as value is not a RID and Waterline does not expect an error.');
        values[key] = null;
      }
    }
    else if(foreignKey) {
      log.warn('Nullifying foreign key [' + key + '] (value: [' + values[key] +
        ']) as value is not a RID and Waterline does not expect an error.');
      values[key] = null;
    }
    
    // TODO: should just be "type === 'binary'" but for some reason type never seems to
    // be equal to 'binary'. Waterline issue?
    if ((type === 'binary' || !type) && Buffer.isBuffer(values[key])) {
      values[key] = values[key].toString('base64');
    }
  }); 

  returnResult.values = values;

  return returnResult;
};

