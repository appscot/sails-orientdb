"use strict";

var _ = require('lodash'),
    utils = require('../utils'),
    Query = require('../query'),
    Record = require('../record'),
    log = require('debug-logger')('sails-orientdb:document');

/**
 * Manage A Document
 *
 * @param {Object}      definition
 * @param {Connection}  connection
 * @api public
 */
var Document = module.exports = function Document(definition, connection, collectionsByIdentity) {

  // Set a tableName for this document
  this.tableName = '';
  
  // If tableName is changed, this holds the original name
  this.tableNameOriginal = '';
  
  // Set an identity for this document
  this.identity = '';

  // Set the orientdb super class ("document" / V / E) for this document
  this.superClass = '';
  
  // Oriento class object, set by Connection constructor
  this.databaseClass = undefined;
  
  // Set a class command that will be passed to Oriento ("undefined" / VERTEX / EDGE)
  this.classCommand = undefined;

  // Hold collection original attributes
  this.attributes = null;

  // Hold Schema Information
  this.schema = null;
  
  // Hold schema in OrientDB friendly format
  this.orientdbSchema = null;
  
  // Schemaless mode
  this.schemaless = false;
  
  // Hold the primary key from definition
  this.primaryKey = '';

  // Hold a reference to an active connection
  this.connection = connection;
  
  // Hold a reference to migrate option
  this.migrate = 'safe';

  // Hold Indexes
  this.indexes = [];
  
  // Holds links between properties (associations)
  this.links = [];

  // Parse the definition into document attributes
  this._parseDefinition(definition, collectionsByIdentity);

  // Build an indexes dictionary
  this._buildIndexes();

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
    if(self.schemaless) { criteria.schemaless = true; }
    _query = new Query(criteria, self.connection);
  
    query = _query.getSelectQuery(self.tableNameOriginal, self.schema);
    if(self.tableNameOriginal !== self.tableName){
      query.query[0] = query.query[0].replace(self.tableNameOriginal, self.tableName);
    }
  } catch(e) {
    log.error('Failed to compose find SQL query.', e);
    return cb(e);
  }
  
  log.debug('Find query:', query.query[0]);
  
  var opts = { params: query.params || {} };
  if(query.params){
    log.debug('Find params:', opts);
  }
  if(criteria.fetchPlan){
    opts.fetchPlan = criteria.fetchPlan.where;
    log.debug('Find fetchPlan:', opts.fetchPlan);
  }
  
  self.connection.db
    .query(query.query[0], opts)
    .all()
    .then(function (res) {
      log.debug('Find results:', res && res.length);
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
      record;
   
  record = new Record(values, self.schema, self.connection, 'insert');
  
  log.debug('Insert into [' + self.tableName + '] values:', record.values);
  
  self.connection.db.insert()
    .into(self.tableName)
    .set(record.values)
    .one()
    .then(function(res) {
      log.debug('Insert result id:', res['@rid']);
      cb(null, utils.rewriteIds(res, self.schema));
    })
    .error(function(err) {
      log.error('Failed to create object in [' + self.tableName + ']. DB error:', err);
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
      record,
      where,
      self = this;

  // Catch errors from building query and return to the callback
  try {
    _query = new Query(criteria, self.connection);
    record = new Record(values, self.schema, self.connection);
    log.debug('Update [' + self.tableName + '] with values:', record.values);
    where = _query.getWhereQuery(self.tableNameOriginal);
    if(self.tableNameOriginal !== self.tableName){
      where.query[0] = where.query[0].replace(self.tableNameOriginal, self.tableName);
    }
  } catch(e) {
    log.error('Failed to compose update SQL query:', e);
    return cb(e);
  }

  var query = self.connection.db.update(self.tableName)
    .set(record.values)
    .return('AFTER');
  
  if(where.query[0]){
    log.debug('Update where query:', where.query[0]);
    query = query.where(where.query[0]);
    if(where.params){
      log.debug('Update params:', where.params);
      query = query.addParams(where.params);
    }
  }
   
  query
    .all()
    .then(function(res) {
      log.debug('Update results:', res && res.length);
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
  var _query,
      where,
      self = this;

  // Catch errors from building query and return to the callback
  try {
    _query = new Query(criteria, self.connection);
    where = _query.getWhereQuery(self.tableNameOriginal);
    if(self.tableNameOriginal !== self.tableName){
      where.query[0] = where.query[0].replace(self.tableNameOriginal, self.tableName);
    }
  } catch(e) {
    log.error('Destroy [' + self.tableName + ']: failed to compose destroy SQL query.', e);
    return cb(e);
  }

  var query = self.connection.db.delete()
    .from(self.tableName)
    .return('BEFORE');
  
  if(where.query[0]){
    log.debug('Destroy [' + self.tableName + '] where:', where.query[0]);
    query.where(where.query[0]);
    if(where.params){
      log.debug('Destroy [' + self.tableName + '] params:', where.params);
      query.addParams(where.params);
    }
  }
   
  query
    .all()
    .then(function(res) {
      log.debug('Destroy [' + self.tableName + '] deleted records:', res && res.length);
      cb(null, utils.rewriteIds(res, self.schema));
    })
    .error(function(err) {
      log.error('Destroy [' + self.tableName + ']: failed to update, error:', err);
      cb(err);
    });
};


//Deletes a collection from database
Document.prototype.drop = function (relations, cb) {
  var self = this;
  self.databaseClass = null;

  self.connection.db.class.drop(self.tableName)
    .then(function (res) {
      log.debug('Dropped [' + self.tableName + ']');
      cb(null, res);
    })
    .error(cb);
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
  
  // Hold the original attributes
  this.attributes = definition.attributes;
  
  this.primaryKey = _.clone(definition.primaryKey);

  // Set the tableName
  var tableName = definition.tableName ? definition.tableName : definition.identity.toLowerCase();
  this.tableName = _.clone(tableName);
  this.tableNameOriginal = _.clone(tableName);
  
  // Set the identity
  var identity = definition.identity ? definition.identity : definition.tableName;
  this.identity = _.clone(identity);
  
  // Set migrate
  this.migrate = _.clone(definition.migrate);

  if(definition.schema !== undefined){
    this.schemaless = !definition.schema;
  }

  // Create orientdbSchema
  this.orientdbSchema = {};
  
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
    
    var propertyDefinition = self.schema[attributeName];
    
    
    if (propertyDefinition && propertyDefinition.columnName === '@rid') {
      log.warn('Ignoring attribute "' + attributeName + '", sails-orientdb already maps @rid column to "id".');
      return;
    }
    
    // definition.definition doesn't seem to contain everything... using definition.attributes ocasionally
    var propAttributes = utils.getAttributeAsObject(self.attributes, columnName);
    
    //log.debug('table: ' + self.tableName + ', processing attribute ' + attributeName + ':', propertyDefinition);
    
    if ( typeof propertyDefinition === 'string')
      attributeType = propertyDefinition;
    else if ( typeof propertyDefinition === 'function')
      return;
    else if (propertyDefinition.model || propertyDefinition.references) {
      linkedIdentity = propertyDefinition.model || propertyDefinition.references;
      linkedDefinition = collectionsByIdentity[linkedIdentity];
      var useLink = linkedDefinition.primaryKey === 'id';
      linkedClass = linkedDefinition.tableName ? linkedDefinition.tableName : linkedDefinition.identity.toLowerCase();
      attributeType = useLink ? 'Link' : definition.pkFormat;
    } else if (propertyDefinition.foreignKey) {
      attributeType = 'Link';
    } else if (propertyDefinition.collection) {
      attributeType = 'linkset';
      linkedIdentity = propertyDefinition.collection;
      linkedDefinition = collectionsByIdentity[linkedIdentity];
      linkedClass = linkedDefinition.tableName ? linkedDefinition.tableName : linkedDefinition.identity.toLowerCase();
    } else
      attributeType = propertyDefinition.type;

    if (attributeType === 'array')
      attributeType = 'embeddedlist';
    else if (attributeType === 'json')
      attributeType = 'embedded';
    else if (attributeType && 
        ['text', 'email', 'alphanumeric', 'alphanumericdashed'].indexOf(attributeType.toLowerCase()) >= 0)
      attributeType = 'string';

    if (propertyDefinition.columnName)
      columnName = propertyDefinition.columnName;

    if (attributeType) {
      var prop = {
        name : columnName,
        type : attributeType
      };
      
      // Check for required flag (not super elegant)
      if (propAttributes && !!propAttributes.required) {
        prop.mandatory = true;
      }
      
      self.orientdbSchema[columnName] = prop;
      
      //log.debug('attributeType for ' + attributeName + ':', self.orientdbSchema[columnName].type);

      // process links
      if (attributeType.toLowerCase().indexOf('link') === 0 && linkedClass){
        self.links.push({
          name : columnName,
          linkedClass : linkedClass
        });
      }
    }
  });
};


/**
 * Build Internal Indexes Dictionary based on the current schema.
 *
 * @api private
 */
Document.prototype._buildIndexes = function _buildIndexes() {
  var self = this;

  Object.keys(this.schema).forEach(function(key) {
    var columnName = self.schema[key].columnName ? self.schema[key].columnName : key;
    var index = {
      name: self.tableName + '.' + columnName
    };

    // If index key is `id` or columnName is `@rid` ignore it because OrientDB will automatically handle this
    if(key === 'id' || columnName === '@rid') {
      return;
    }

    // Handle Unique Indexes
    if(self.schema[key].unique) {
      
      // set the index type
      index.type = 'unique';

      // Store the index in the collection
      self.indexes.push(index);
      return;
    }

    // Handle non-unique indexes
    if(self.schema[key].index) {
      
      // set the index type
      if(!self.schema[key].index.toLowerCase){
        index.type = 'notunique';
        self.indexes.push(index);
        return;
      }
      
      index.type = self.schema[key].index.toLowerCase();
      
      var supportedIndexes = ['unique', 'notunique', 'fulltext', 'dictionary', 'unique_hash_index', 
                              'notunique_hash_index', 'fulltext_hash_index', 'dictionary_hash_index'];
      if (supportedIndexes.indexOf(index.type) < 0){
        throw new Error('Index ' + self.schema[key].index + ' is not supported. Please use one of: ' + 
                        supportedIndexes + '.');
      }

      // Store the index in the collection
      self.indexes.push(index);
      return;
    }
  });
};

