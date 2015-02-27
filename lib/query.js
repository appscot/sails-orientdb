"use strict";
/**
 * Module dependencies
 */
var _ = require('lodash'),
    utils = require('./utils'),
    hop = utils.object.hop,
    RID = require('oriento').RID;


/**
 * Query Constructor
 *
 * Normalizes Waterline queries to work with Oriento.
 *
 * @param {Object} options
 * @api private
 */
var Query = module.exports = function Query(options, connection) {
  
  // Sequel builder
  this.sequel = connection.sequel;
  
  // decode
  this.decodeURIComponent = connection.config.options.decodeURIComponent;
  
  // Normalize Criteria
  this.criteria = this.normalizeCriteria(options);

  return this;
};


/**
 * Normalize Criteria
 *
 * Transforms a Waterline Query into a query that can be used
 * with Oriento. For example it sets '>' to $gt, etc.
 *
 * @param {Object} options
 * @return {Object}
 * @api private
 */
Query.prototype.normalizeCriteria = function normalizeCriteria(options) {
  var self = this;

  return _.mapValues(options, function (original, key) {
    if (key === 'where') return self.parseWhere(original);
    return original;
  });
};


/**
 * Parse Where
 *
 * <where> ::= <clause>
 *
 * @api private
 *
 * @param original
 * @returns {*}
 */
Query.prototype.parseWhere = function parseWhere(original) {
  var self = this;

  // Fix an issue with broken queries when where is null
  //if(_.isNull(original)) return {};
  if(_.isNull(original)) return null;

  return self.parseClause(original);
};


/**
 * Parse Clause
 *
 * <clause> ::= { <clause-pair>, ... }
 *
 * <clause-pair> ::= <field> : <expression>
 *                 | or|$or: [<clause>, ...]
 *                 | $or   : [<clause>, ...]
 *                 | $and  : [<clause>, ...]
 *                 | $nor  : [<clause>, ...]
 *                 | like  : { <field>: <expression>, ... }
 *
 * @api private
 *
 * @param original
 * @returns {*}
 */
Query.prototype.parseClause = function parseClause(original) {
  var self = this;
  
  return self.fixId(original);
};



/**
 * Convert IDs into RIDs
 *
 * <clause> ::= { <clause-pair>, ... }
 *
 * <clause-pair> ::= <field> : <expression>
 *                 | or|$or: [<clause>, ...]
 *                 | $or   : [<clause>, ...]
 *                 | $and  : [<clause>, ...]
 *                 | $nor  : [<clause>, ...]
 *                 | like  : { <field>: <expression>, ... }
 *
 * @api private
 *
 * @param original
 * @returns {*}
 */
Query.prototype.fixId = function fixId(original) {
  var self = this;

  return _.reduce(original, function parseClausePair(obj, val, key) {

    // handle Logical Operators
    if (['or', 'and', 'nor'].indexOf(key) !== -1) {
      // Value of or, and, nor require an array, else ignore
      if (_.isArray(val)) {
        val = _.map(val, function (clause) {
          return self.parseClause(clause);
        });
        obj[key] = val;
      }
    }

    // Default
    else {
      // Normalize `id` key into orientdb `@rid`
      if (key === 'id' && !hop(this, '@rid')) {
        key = '@rid';
        obj[key] = self.decode(val);
      } else if(key === '@rid') {
        obj[key] = self.decode(val);
      } else {
        obj[key] = val;
      }
    }

    return obj;
  }, {}, original);
};


/**
 * Decodes ID from encoded URI component
 *
 * @api private
 *
 * @param   {Array|Object|String} idValue
 * @returns {Array|String}
 */
Query.prototype.decode = function decode(idValue) {
  var self = this;
  
  if(! idValue || !self.decodeURIComponent) { return idValue; }
  
  function decodeURI(id){
    var res = id;
    if(id.indexOf('%23') === 0){
      res = res.replace('%23', '#');
      res = res.replace('%3A', ':');
    }
    return res;
  }
  
  if(_.isArray(idValue)){
    return _.map(idValue, decodeURI);
  }
  
  return decodeURI(idValue);
};


/**
 * Get Select Query
 *
 * @api public
 * @param   {String} collection
 * @returns {Object}
 */
Query.prototype.getSelectQuery = function getSelectQuery(collection, attributes) {
  var self = this;
  
  var _query = self.sequel.find(collection, self.criteria);
  _query.query[0] = _query.query[0].replace(collection.toUpperCase(), collection);
  _query.params = _.reduce(_query.values[0], function(accumulator, value, index){
    var key = _query.keys[0][index];
    var attribute = utils.getAttributeAsObject(attributes, key) || {};
    var foreignKeyOrId = key === '@rid' || key && key.indexOf('.@rid') !== -1 || 
                          attribute.foreignKey || attribute.model || false;
    var paramValue = foreignKeyOrId && _.isString(value) && utils.matchRecordId(value) ? new RID(value) : value;
    
    accumulator['param' + index] = paramValue;
    return accumulator;
  }, {});
  
  return _query;
};


/**
 * Get Where Query
 *
 * @api public
 * @param   {String} collection
 * @returns {Object}
 */
Query.prototype.getWhereQuery = function getWhereQuery(collection) {
  var self = this;
  
  var _where = self.getSelectQuery(collection);
  _where.query[0] = _where.query[0].split('WHERE')[1];
  _where.query[0] = _where.query[0] && _where.query[0].trim() !== '' ? _where.query[0] : null;
  
  return _where;
};



