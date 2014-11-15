/**
 * Module dependencies
 */
var _ = require('lodash'),
    utils = require('./utils'),
    hop = utils.object.hasOwnProperty;


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
  
  // generic join uses several DB requests, lower performance
  this.useGenericJoin = false;

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
  "use strict";
  var self = this;

  return _.mapValues(options, function (original, key) {
    if (key === 'where') return self.parseWhere(original);
    if (key === 'joins') return self.parseJoins(original);
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
  
  var fixedIdClause = self.fixId(original);
  return self.normalizeMulilevelCriteria(fixedIdClause);
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
Query.prototype.fixId = function parseClause(original) {
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
      if (key === 'id' && !hop(this, '@rid')) key = '@rid';

      obj[key] = val;
    }

    return obj;
  }, {}, original);
};



/**
 * Normalize multi-level criteria into an array of where clauses
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
 * @returns [{*}]
 */
Query.prototype.normalizeMulilevelCriteria = function parseClause(criteria) {
  "use strict";
  var self = this;

  var newCriteria = _.reduce(criteria, function parseClausePair(obj, val, key) {
    "use strict";
    
    if(_.isArray(val)){
      obj.push(self.getSubQuery(key, 'in', '[' + val + ']'));
      return obj;
    }
    
    if(!_.isPlainObject(val)){
    	obj[0][key] = val;
    	return obj;
    }
    
    _.forEach(val, function(value, modifier){
    	if(modifier === '<' || modifier === 'lessThan' || modifier.toLowerCase() === 'lt') {
    		obj.push(self.getSubQuery(key, '<', value));
    	}
    	else if(modifier === '<=' || modifier === 'lessThanOrEqual' || modifier.toLowerCase() === 'lte') {
    		obj.push(self.getSubQuery(key, '<=', value));
    	}
    	else if(modifier === '>' || modifier === 'greaterThan' || modifier.toLowerCase() === 'gt') {
    		obj.push(self.getSubQuery(key, '>', value));
    	}
    	else if(modifier === '>=' || modifier === 'greaterThanOrEqual' || modifier.toLowerCase() === 'gte') {
    		obj.push(self.getSubQuery(key, '>=', value));
    	}
    });

    return obj;
  }, [{}], criteria);
  
  if (Object.keys(newCriteria[0]).length == 0)
    return newCriteria.slice(1);
    
  return newCriteria;
};


Query.prototype.getSubQuery = function getSubQuery(key, modifier, value) {
	return key + ' ' + modifier + ' ' + value;
};



/**
 * Parse Joins
 *
 * <where> ::= <clause>
 *
 * @api private
 *
 * @param original
 * @returns {*}
 */
Query.prototype.parseJoins = function parseJoins(original) {
  "use strict";
  var self = this;

  // Fix an issue with broken queries when where is null
  if(_.isNull(original)) return null;
  if(original.length == 0) return original; 
  
  original.forEach(function(join){
    if (join.parentKey === 'id')
      self.useGenericJoin = true;
      //simplistic approach. The more complete one would be to check if there is
      //a link pointing at parent model
  });

  return original;
};
