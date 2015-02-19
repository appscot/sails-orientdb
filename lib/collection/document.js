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
var Document = module.exports = function Document(definition, connection, databaseClass, collectionsByIdentity) {

  // Set a tableName for this document
  this.tableName = '';
  
  // Set an identity for this document
  this.identity = '';

  // Set the orientdb super class ('document' / V / E) for this document
  this.superClass = '';
  
  // Set the Oriento class object
  this.databaseClass = databaseClass;
  
  // Set a class command that will be passed to Oriento ( 'undefined' / VERTEX / EDGE)
  this.classCommand = undefined;

  // Hold Schema Information
  this.schema = null;
  
  // Hold Schema in OrientDB friendly format
  this.orientdbSchema = null;
  
  // Hold the waterline schema, used by query namely waterline-sequel-orientdb
  this.waterlineSchema = null;

  // Hold a reference to an active connection
  this.connection = connection;

  // Hold Indexes
  // this.indexes = [];
  
  // Holds links between properties (associations)
  this.links = [];

  // Parse the definition into document attributes
  this._parseDefinition(definition, collectionsByIdentity);

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

Document.prototype._parseDefinition = function _parseDefinition(definition, collectionsByIdentity) {
  collectionsByIdentity = collectionsByIdentity || {};
  var collectionDef = _.cloneDeep(definition);
  
  var self = this;

  // Hold the Schema
  this.schema = collectionDef.definition;

  // TODO: not sure why sails-mongo does this...
  // if (_.has(this.schema, 'id') && this.schema.id.primaryKey && this.schema.id.type === 'integer') {
    // this.schema.id.type = 'objectid';
  // }

  // Set the tableName
  var tableName = definition.tableName ? definition.tableName : definition.identity.toLowerCase();
  this.tableName = _.clone(tableName);
  
  // Set the identity
  var identity = definition.identity ? definition.identity : definition.tableName;
  this.identity = _.clone(identity);
  
  this.waterlineSchema = definition.waterline.schema;
  
  
  this.orientdbSchema = {};
  
  log.debug('Creating DB class [' + tableName + '] for collection [' + identity + ']');
  Object.keys(self.schema).forEach(function(attributeName) {
    if (attributeName === 'id') {
      // @rid is the equivalent of id, no need to add id.
      return;
    }
    
    var linkedClass = null,
        attributeType = null,
        columnName = attributeName,
        linkedIdentity,
        linkedDefinition;
        
    if ( typeof self.schema[attributeName] === 'string')
      attributeType = self.schema[attributeName];
    else if ( typeof self.schema[attributeName] === 'function')
      return;
    else if (self.schema[attributeName].model || self.schema[attributeName].references) {
      linkedIdentity = self.schema[attributeName].model || self.schema[attributeName].references;
      linkedDefinition = collectionsByIdentity[linkedIdentity];
      var useLink = linkedDefinition.primaryKey === 'id';
      linkedClass = linkedDefinition.tableName ? linkedDefinition.tableName : linkedDefinition.identity.toLowerCase();
      attributeType = useLink ? 'Link' : definition.pkFormat;
    } else if (self.schema[attributeName].foreignKey) {
      attributeType = 'Link';
    } else if (self.schema[attributeName].collection) {
      attributeType = 'linkset';
      linkedIdentity = self.schema[attributeName].collection;
      linkedDefinition = collectionsByIdentity[linkedIdentity];
      linkedClass = linkedDefinition.tableName ? linkedDefinition.tableName : linkedDefinition.identity.toLowerCase();
    } else
      attributeType = self.schema[attributeName].type;

    if (attributeType === 'array')
      attributeType = 'embeddedlist';
    else if (attributeType === 'json')
      attributeType = 'embedded';
    else if (attributeType && 
        ['text', 'email', 'alphanumeric', 'alphanumericdashed'].indexOf(attributeType.toLowerCase()) >= 0)
      attributeType = 'string';

    if (self.schema[attributeName].columnName)
      columnName = self.schema[attributeName].columnName;

    if (attributeType) {
      var prop = {
        name : columnName,
        type : attributeType
      };
      if (!!self.schema[attributeName].required) {
        prop.mandatory = true;
      }
      self.orientdbSchema[columnName] = prop;
      
      //log.debug('attributeType for ' + attributeName + ':', self.orientdbSchema[columnName].type);

      if (attributeType.toLowerCase().indexOf('link') === 0 && linkedClass){
        self.links.push({
          klass : tableName,
          attributeName : columnName,
          linkedClass : linkedClass
        });
        
        // TODO: temporary, remove afterwards
        self.connection.linksToBeCreated.push({
          klass : tableName,
          attributeName : columnName,
          linkedClass : linkedClass
        });
      }
    }
  });
 

};

