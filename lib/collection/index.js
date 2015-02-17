"use strict";

/**
 * Manage A Collection
 *
 * @param {Object}      definition
 * @param {Connection}  connection
 * @api public
 */
var Collection = module.exports = function Collection(definition, connection) {

  // Set an identity for this collection
  this.identity = '';

  // Set the orientdb class (tableName) for this collection
  this.klass = '';

  // Set the orientdb super class (document / vertex / edge) for this collection
  this.superKlass = '';

  // Hold Schema Information
  this.schema = null;

  // Hold a reference to an active connection
  this.connection = connection;

  // Hold Indexes
  // this.indexes = [];

  // Parse the definition into collection attributes
  this._parseDefinition(definition);

  // Build an indexes dictionary
  //this._buildIndexes();

  return this;
};

/////////////////////////////////////////////////////////////////////////////////
// PUBLIC METHODS
/////////////////////////////////////////////////////////////////////////////////

/**
 * Find Documents
 *
 * @param {Object} criteria
 * @param {Function} callback
 * @api public
 */
Collection.prototype.find = function find(criteria, cb) {

};

/**
 * Insert A New Document
 *
 * @param {Object|Array} values
 * @param {Function} callback
 * @api public
 */
Collection.prototype.insert = function insert(values, cb) {

};

/**
 * Update Documents
 *
 * @param {Object} criteria
 * @param {Object} values
 * @param {Function} callback
 * @api public
 */
Collection.prototype.update = function update(criteria, values, cb) {

};

/**
 * Destroy Documents
 *
 * @param {Object} criteria
 * @param {Function} callback
 * @api public
 */
Collection.prototype.destroy = function destroy(criteria, cb) {

};

