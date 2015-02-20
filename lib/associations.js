"use strict";
/**
 * Module Dependencies
 */
var _ = require('lodash'),
    _runJoins = require('waterline-cursor'),
    utils = require('./utils'),
    Edge = require('./collection').Edge,
    log = require('debug-logger')('waterline-orientdb:associations');

/**
 * Associations
 *
 * Associations contains methods used in implementing Waterline's Associations
 *
 * @param {Object} connection
 * @api private
 */
var Associations = module.exports = function Associations(connection) {

  // A connection to the DB used for queries
  this.connection = connection;
  this.fetchPlanLevel = connection.config.options.fetchPlanLevel;
  
  return this;
};


/**
 * Join call
 * 
 * @param {String} collectionName
 * @param {Object} criteria
 * @param {Function} cb
 * @return {Object}
 * @api public
 */
Associations.prototype.join = function join(collectionName, criteria, cb) {
  //TODO: for now we only use fetch plan for many-to-many through associations. Use it for all associations
  if(this.isThroughJoin(criteria))
    return this.fetchPlanJoin(collectionName, criteria, cb);
  
  return this.genericJoin(collectionName, criteria, cb);
};


/**
 * Get Fetch Plan
 * 
 * Infers the fetch plan query
 * 
 * @param {String}  collectionName
 * @param {Object}  criteria
 * @return {String} fetchPlan query string
 * @api private
 */
Associations.prototype.getFetchPlan = function getFetchPlan(collectionName, criteria, fetchPlanLevel) {
  var self = this;
  fetchPlanLevel = fetchPlanLevel || 1;
  var parentSchema = self.connection.newCollections[collectionName].attributes;
  var fetchPlan = '';
  var select = [];
  var associations = [];
  
  // Populate joined collections by fetching related vertices
  criteria.joins.forEach(function(join){
    if(!join.junctionTable && !join.select) { return; }
    
    // One-to-* associations such as model (links and linksets)
    if(!join.junctionTable && (parentSchema[join.alias].model || parentSchema[join.alias].collection)){
      fetchPlan += join.parentKey + ':1 ';
      return;
    }
    
    if(!join.junctionTable){
      log.warn("Unexpected behaviour. Can't process join: ", join);
      return;
    }
    
    // Many-to-many through associations (edges)
    associations.push(join.parent);
    var edgeSides = self.getEdgeSides(join.parent);
    
    var parentColumnName;
    if(edgeSides.out.referencedCollectionTableName === join.child && 
      edgeSides.in.referencedAttributeColumnName === join.alias) {
        parentColumnName = 'in_' + join.parent;
        fetchPlan += parentColumnName + ':1 in_' + join.parent + '.out:' + fetchPlanLevel + ' ';
        select.push(parentColumnName);
    }
    else if(edgeSides.in.referencedCollectionTableName === join.child &&
      edgeSides.out.referencedAttributeColumnName === join.alias) {
        parentColumnName = 'out_' + join.parent;
        fetchPlan += parentColumnName + ':1 out_' + join.parent + '.in:' + fetchPlanLevel + ' ';
        select.push(parentColumnName);
    }
  });
  
  // For remaining associated collections, expand the edges to get the vertices' foreign keys 
  Object.keys(parentSchema).forEach(function(attributeKey){
    var joinTable = parentSchema[attributeKey].through;
    if(!joinTable) { return; }
    
    var joinTableName = self.connection.collectionsByIdentity[joinTable].tableName || joinTable;
    if(associations.indexOf(joinTableName) !== -1) { return; } // already processed
    
    var edgeSides = self.getEdgeSides(joinTableName);
    var columnName = parentSchema[attributeKey].columnName || attributeKey;
    
    var associatedCollection = parentSchema[attributeKey].collection;
    var tableName = self.connection.collectionsByIdentity[associatedCollection].tableName;
    var associatedCollectionTablename = tableName || associatedCollection;
    
    var parentColumnName;
    if(edgeSides.out.referencedCollectionTableName === associatedCollectionTablename &&
      edgeSides.in.referencedAttributeColumnName === columnName) {
        parentColumnName = 'in_' + joinTableName;
        fetchPlan += parentColumnName + ':1 ';
        select.push(parentColumnName);
    }
    else if(edgeSides.in.referencedCollectionTableName === associatedCollectionTablename &&
      edgeSides.out.referencedAttributeColumnName === columnName) {
        parentColumnName = 'out_' + joinTableName;
        fetchPlan += parentColumnName + ':1 ';
        select.push(parentColumnName);
    }
  });
  
  var where = fetchPlan.slice(-1) === ' ' ? fetchPlan.slice(0, -1) : fetchPlan;
  return {
    where: where,
    select: _.unique(select)
  };
};

/**
 * FetchPlan Join call
 * 
 * Makes only one call
 * 
 * @param {String} collectionName
 * @param {Object} criteria
 * @param {Function} cb
 * @return {Object}
 * @api private
 */
Associations.prototype.fetchPlanJoin = function fetchPlanJoin(collectionName, criteria, cb) {
  var self = this;
  
  var opts = criteria._orientdb || {};
  var fetchPlanLevel = opts.fetchPlanLevel || self.fetchPlanLevel;
  
  var options = _.clone(criteria);
  options.fetchPlan = self.getFetchPlan(collectionName, criteria, fetchPlanLevel);
  var parentSchema = self.connection.newCollections[collectionName].attributes;
  
  self.connection.find(collectionName, options, function(err, results){
    if(err)
      return cb(err);
    else if(!results || results.length === 0)
      return cb(null, results);
    
    var normalisedResults = [];
    var keysToDelete = [];
    
    var expandedResults = self.expandResults(results);
    
    expandedResults.forEach(function(record){
    
      criteria.joins.forEach(function(join){
        var childTableSchema = self.connection.newCollections[join.child].attributes;
        
        if(join.parent === collectionName){
          if(join.removeParentKey)
            keysToDelete.push(join.parentKey);
          
          if (record[join.alias] && _.isObject(record[join.alias]))
            record[join.alias] = utils.rewriteIds(record[join.alias], childTableSchema);
            utils.cleanOrientAttributes(record[join.alias], childTableSchema);
          return; //nothing more to do
        }
        
        if(!join.junctionTable){
          return; //TODO: we should also handle many-to-many joins
        }
        
        var edgeSides = self.getEdgeSides(join.parent);
        var parentSide;
        if(edgeSides.out.referencedCollectionTableName === join.child &&
          edgeSides.in.referencedAttributeColumnName === join.alias) {
            parentSide = edgeSides.in;
        }
        else if(edgeSides.in.referencedCollectionTableName === join.child &&
          edgeSides.out.referencedAttributeColumnName === join.alias) {
            parentSide = edgeSides.out; 
        }
      
        //Process record
        //TODO: record may be array
        
        if(!parentSide || !record[parentSide.referencedAttributeEdge]){
          return; //it probably has been processed already
        }
        
        record[join.alias] = self.getVerticesFromEdges(record[parentSide.referencedAttributeEdge],
                                                       parentSide.edgeOppositeEnd);
        delete record[parentSide.referencedAttributeEdge];
        
        record[join.alias] = utils.rewriteIds(record[join.alias], childTableSchema);

        record[join.alias].forEach(function(associatedRecord){
          utils.cleanOrientAttributes(associatedRecord, childTableSchema);
        });
      });
      
      utils.cleanOrientAttributes(record, parentSchema);
      
      normalisedResults.push(record);
  });
  
  cb(err, normalisedResults);
  });
};


/**
 * Expand Results
 * 
 * Takes result set from fetch plan and replace RIDs with proper object
 * 
 * @param {Object} resultset
 * @return {Object}
 * @api private
 */
Associations.prototype.expandResults = function expandResults(resultset) {
  var clonedResults = _.cloneDeep(resultset);
  
  var recordMap = utils.reduceNestedObjects(clonedResults, function(accumulator, obj){
      if(obj.id)
        accumulator[obj.id] = _.cloneDeep(obj); // ugly but avoids circular references issues when converting to json
      if(obj['@rid'])
        log.warn('fetchPlanJoin: object ' + obj['@rid'] + ' still has @rid!');
      return accumulator;
    }, {});
  
  utils.forEachNested(clonedResults, function(value, key, parent){
    if(key !== 'id' && /*utils.matchRecordId(value) &&*/ recordMap[value]){
      parent[key] = recordMap[value];
    }
  });
  
  return clonedResults;
};


/**
 * Converts edges into an array of objects representing vertices. Edges can be a single value or a 
 * mixed array of strings and objects
 * 
 * @param {Object} result
 * @return {Array}
 * @api private
 */
Associations.prototype.getVerticesFromEdges = function getVerticesFromEdges(edges, side) {
  if(!_.isArray(edges)){
    if(_.isString(edges)) { return []; }  // only carries ID of edge
    var vertex = _.isString(edges[side]) ? { id: edges[side] } : edges[side];
    return [ vertex ];
  }
  
  var filteredEdges = _.filter(edges, function(edge) { return !_.isString(edge); });
  
  var vertices = _.map(filteredEdges, function(edge){
    return _.isString(edge[side]) ? { id: edge[side] } : edge[side];
  });
  
  return vertices;
};


/**
 * Generic Join call
 * 
 * Makes multiple calls over the network
 * 
 * @param {String} collectionName
 * @param {Object} criteria
 * @param {Function} cb
 * @return {Object}
 * @api private
 */
Associations.prototype.genericJoin = function genericJoin(collectionName, criteria, cb) {
  var self = this;
  
  // Ignore `select` from waterline core
  if ( typeof criteria === 'object') {
    delete criteria.select;
  }

  var connectionObject = self.connection;

  // Populate associated records for each parent result
  // (or do them all at once as an optimization, if possible)
  _runJoins({
    
    instructions: criteria,
    parentCollection: collectionName,

    /**
     * Find some records directly (using only this adapter)
     * from the specified collection.
     *
     * @param  {String}   collectionIdentity
     * @param  {Object}   criteria
     * @param  {Function} cb
     */
    $find: function (collectionIdentity, criteria, cb) {
      return connectionObject.find(collectionIdentity, criteria, function(err, res){
        if (err) { return cb(err); }
        res.forEach(function(record){ utils.cleanOrientAttributes(record /*, TODO: add schema */); });
        cb(null, res);
      });
    },

    /**
     * Look up the name of the primary key field
     * for the collection with the specified identity.
     *
     * @param  {String}   collectionIdentity
     * @return {String}
     */
    $getPK: function (collectionIdentity) {
      if (!collectionIdentity) return;
      var schema = connectionObject.newCollections[collectionIdentity].attributes;
      
      if(!schema)
       return 'id'; 
      
      var key;
      for(key in schema){
        if(schema[key].primaryKey)
          return key;
      }
      return 'id';
    }
  }, cb);

}; 


/**
 * Get edge sides
 *
 * Returns and object describing the out and the in sides of the edge
 *
 * @param {Object} collectionName
 * @return {Object}
 * @api private
 */
Associations.prototype.getEdgeSides = function getEdgeSides(collectionName) {
  var edge = this.connection.newCollections[collectionName];
  return edge.edgeSides;
};



/**
 * Get edge
 *
 * Normalizes data for edge creation
 *
 * @param {Object} values
 * @return {Object}
 * @api private
 */
Associations.prototype.getEdge = function getEdge(collectionName, values) {
  var edgeSides = this.getEdgeSides(collectionName);
  return {
    from : values && values[edgeSides.out.junctionTableColumnName],
    to : values && values[edgeSides.in.junctionTableColumnName],
    keys: [edgeSides.out.junctionTableColumnName, edgeSides.in.junctionTableColumnName]
  };
}; 



/**
 * Is many-to-many through join
 * 
 * @param {Object} criteria
 * @return {Boolean}
 * @api public
 */
Associations.prototype.isThroughJoin = function isThroughJoin(criteria) {
  var self = this;
  if(!criteria.joins)
    return false;
  
  for(var i=0; i < criteria.joins.length; i++){
    var join = criteria.joins[i];
    var collectionInstance = self.connection.newCollections[join.parent];
    if(collectionInstance instanceof Edge)
      return true;
  }
  
  return false;
};