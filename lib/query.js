/**
 * Module dependencies
 */
var _ = require('lodash'),
    utils = require('./utils'),
    hop = utils.object.hasOwnProperty,
    Sequel = require('waterline-sequel-orientdb');
    

// waterline-sequel-orientdb options
var sqlOptions = {
  parameterized : false,
  caseSensitive : false,
  escapeCharacter : '',
  casting : false,
  canReturnValues : false,
  escapeInserts : true
}; 


/**
 * Query Constructor
 *
 * Normalizes Waterline queries to work with Oriento.
 *
 * @param {Object} options
 * @api private
 */
var Query = module.exports = function Query(options, schema) {

  // Cache the schema for use in parseTypes
  this.schema = schema;

  // Normalize Criteria
  this.criteria = this.normalizeCriteria(options);
  
  // Instantiate a sequel helper
  this.sequel = new Sequel(schema, sqlOptions);

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
  "use strict";
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
  "use strict";
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
  "use strict";
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
  "use strict";
  var self = this;

  return _.reduce(original, function parseClausePair(obj, val, key) {
    "use strict";

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
        obj[key] = self.processIdValue(val);
      } else {
        obj[key] = val;
      }
    }

    return obj;
  }, {}, original);
};


/**
 * Convert ID value to string
 *
 * @api private
 *
 * @param   {Array|Object|String} idValue
 * @returns {String}
 */
Query.prototype.processIdValue = function processIdValue(idValue) {
  var newVal = idValue;
  if(!_.isArray(idValue)){
    newVal = _.isObject(idValue) ? '#' + idValue.cluster + ':' + idValue.position : idValue;
  } else {
    newVal = [];
    idValue.forEach(function(rid){
      var value = _.isObject(rid) ? '#' + rid.cluster + ':' + rid.position : rid;
      newVal.push(value);
    });
  }
  return newVal;
};


/**
 * Get Select Query
 *
 * @api public
 * @param   {String} collection
 * @returns {String}
 */
Query.prototype.getSelectQuery = function getSelectQuery(collection) {
  var self = this;
  
  var _query = self.sequel.find(collection, self.criteria);
  
  return _query.query[0].replace(collection.toUpperCase(), collection);
};


/**
 * Get Where Query
 *
 * @api public
 * @param   {String} collection
 * @returns {String}
 */
Query.prototype.getWhereQuery = function getWhereQuery(collection) {
  var self = this;
  
  var _where = self.sequel.simpleWhere(collection, self.criteria, sqlOptions);
  where = _where.query.replace('WHERE ', '');
  
  return where !== '' ? where : null;
};



