"use strict";

var _ = require('lodash'),
    utils = require('../utils'),
    Query = require('../query'),
    Document = require('../document'),
    log = require('debug-logger')('waterline-orientdb:document');

/**
 * Manage A Document
 *
 * @param {Object}      definition
 * @param {Connection}  connection
 * @api public
 */
var Document = module.exports = function Document(definition, connection) {

  // Set an identity for this document
  this.identity = '';

  // Set the orientdb super class (document / vertex / edge) for this document
  this.superClass = '';

  // Hold Schema Information
  this.schema = null;
  
  // Hold the waterline schema, used by query (for now)
  this.waterlineSchema = null;

  // Hold a reference to an active connection
  this.connection = connection;

  // Hold Indexes
  // this.indexes = [];

  // Parse the definition into document attributes
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
Document.prototype.find = function find(criteria, cb) {
  var self = this;
  var _query, query;
  
  console.log('find, self.identity: ' + self.identity);
  
  try {
    _query = new Query(criteria, self.waterlineSchema, self.connection.config);
  } catch(err) { return cb(err); }
  
  var edge;
  if (self.superClass === 'E') {
    edge = self.connection.associations.getEdge(self.identity, criteria.where);
  }
  if (edge) {
    // Replace foreign keys with from and to
    if(edge.from) { _query.criteria.where.out = edge.from; }
    if(edge.to)   { _query.criteria.where.in = edge.to; }
    if(_query.criteria.where){
      edge.keys.forEach(function(refKey) { delete _query.criteria.where[refKey]; });
    }
  }
  
  try {
    query = _query.getSelectQuery(self.identity);
  } catch(e) {
    log.error('Failed to compose find SQL query.', e);
    return cb(e);
  }
  
  log.debug('OrientDB query:', query.query[0]);
  
  var opts = { params: query.params || {} };
  if(query.params){
    log.debug('params:', opts);
  }
  if(criteria.fetchPlan){
    opts.fetchPlan = criteria.fetchPlan.where;
    log.debug('opts.fetchPlan:', opts.fetchPlan);
  }
  
  self.connection.db
    .query(query.query[0], opts)
    .all()
    .then(function (res) {
      if (res && criteria.fetchPlan) {
        //log.debug('res', res);
        cb(null, utils.rewriteIdsRecursive(res, self.schema));
      } else {
        cb(null, utils.rewriteIds(res, self.schema));
      }
    })
    .error(function (e) {
      log.error('Failed to query the DB.', e);
      cb(e);
    });
};

/**
 * Insert A New Document
 *
 * @param {Object|Array} values
 * @param {Function} callback
 * @api public
 */
Document.prototype.insert = function insert(values, cb) {

};

/**
 * Update Documents
 *
 * @param {Object} criteria
 * @param {Object} values
 * @param {Function} callback
 * @api public
 */
Document.prototype.update = function update(criteria, values, cb) {

};

/**
 * Destroy Documents
 *
 * @param {Object} criteria
 * @param {Function} callback
 * @api public
 */
Document.prototype.destroy = function destroy(criteria, cb) {

};



/////////////////////////////////////////////////////////////////////////////////
// PRIVATE METHODS
/////////////////////////////////////////////////////////////////////////////////


/**
 * Parse Document Definition
 *
 * @param {Object} definition
 * @api private
 */

Document.prototype._parseDefinition = function _parseDefinition(definition) {
  var self = this,
      collectionDef = _.cloneDeep(definition);

  // Hold the Schema
  this.schema = collectionDef.definition;

  // TODO: not sure why sails-mongo does this...
  // if (_.has(this.schema, 'id') && this.schema.id.primaryKey && this.schema.id.type === 'integer') {
    // this.schema.id.type = 'objectid';
  // }

  // Set the identity
  var ident = definition.tableName ? definition.tableName : definition.identity.toLowerCase();
  this.identity = _.clone(ident);
  
  this.waterlineSchema = definition.waterline.schema;
};

