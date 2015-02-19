"use strict";

var _ = require('lodash'),
    utils = require('../utils'),
    Query = require('../query'),
    Doc = require('../document'),
    log = require('debug-logger')('waterline-orientdb:document');

/**
 * Manage A Document
 *
 * @param {Object}      definition
 * @param {Connection}  connection
 * @api public
 */
var Document = module.exports = function Document(definition, connection) {

  // Set a tableName for this document
  this.tableName = '';
  
  // Set an identity for this document
  this.identity = '';

  // Set the orientdb super class ('document' / V / E) for this document
  this.superClass = '';
  
  // Set a class command that will be passed to Oriento ( 'undefined' / VERTEX / EDGE)
  this.classCommand = undefined;

  // Hold Schema Information
  this.schema = null;
  
  // Hold the waterline schema, used by query namely waterline-sequel-orientdb
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
  
  try {
    _query = new Query(criteria, self.waterlineSchema, self.connection.config);
  } catch(err) { return cb(err); }
  
  try {
    query = _query.getSelectQuery(self.tableName, self.schema);
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
 * @param {Object|Array}  values
 * @param {Function}      callback
 * @api public
 */
Document.prototype.insert = function insert(values, cb) {
  var self = this,
      _document;
   
  _document = new Doc(values, self.schema, self.connection);
  
  self.connection.db.insert()
    .into(self.tableName)
    .set(_document.values)
    .one()
    .then(function(res) {
      cb(null, utils.rewriteIds(res, self.schema));
    })
    .error(function(err) {
      log.error('Failed to create object. DB error.', err);
      cb(err);
  });
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
  var _query,
      _document,
      where,
      self = this;

  // Catch errors from building query and return to the callback
  try {
    _query = new Query(criteria, self.waterlineSchema, self.connection.config);
    _document = new Doc(values, self.schema, self.connection);
    where = _query.getWhereQuery(self.tableName);
  } catch(e) {
    log.error('Failed to compose update SQL query.', e);
    return cb(e);
  }

  var query = self.connection.db.update(self.tableName)
    .set(_document.values)
    .return('AFTER');
  
  if(where.query[0]){
    query.where(where.query[0]);
    if(where.params){
      query.addParams(where.params);
    }
  }
   
  query
    .all()
    .then(function(res) {
      cb(null, utils.rewriteIds(res, self.schema));
    })
    .error(function(err) {
      log.error('Failed to update, error:', err);
      cb(err);
    });
};

/**
 * Destroy Documents
 *
 * @param {Object} criteria
 * @param {Function} callback
 * @api public
 */
Document.prototype.destroy = function destroy(criteria, cb) {
  var self = this;
  cb = cb || _.noop;
  
  // TODO: should be in a transaction
  self.connection.find(self.tableName, criteria, function(err, results){
    if(err){ return cb(err); }
    
    if(results.length === 0){ return cb(null, results); }
    
    var rids = _.pluck(results, 'id');
    log.debug('deleting rids: ' + rids);
    
    self.connection.db.delete(self.classCommand)
      .where('@rid in [' + rids.join(',') + ']')
      .one()
      .then(function (count) {
        if(parseInt(count) !== rids.length){
          return cb(new Error('Deleted count [' + count + '] does not match rids length [' + rids.length +
            '], some vertices may not have been deleted'));
        }
        cb(null, results);
      })
      .error(cb);
  });
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
  var collectionDef = _.cloneDeep(definition);

  // Hold the Schema
  this.schema = collectionDef.definition;

  // TODO: not sure why sails-mongo does this...
  // if (_.has(this.schema, 'id') && this.schema.id.primaryKey && this.schema.id.type === 'integer') {
    // this.schema.id.type = 'objectid';
  // }

  // Set the tableName
  var tabl = definition.tableName ? definition.tableName : definition.identity.toLowerCase();
  this.tableName = _.clone(tabl);
  
  // Set the identity
  var ident = definition.identity ? definition.identity : definition.tableName;
  this.identity = _.clone(ident);
  
  this.waterlineSchema = definition.waterline.schema;
};

