"use strict";

var Oriento = require('oriento'),
    async = require('async'),
    _ = require('lodash'),
    utils = require('./utils'),
    Associations = require('./associations'),
    log = require('debug-logger')('waterline-orientdb:connection'),
    Collection = require('./collection'),
    Sequel = require('waterline-sequel-orientdb');

// waterline-sequel-orientdb options
var sqlOptions = {
  parameterized : true,
  caseSensitive : false,
  escapeCharacter : '',
  casting : false,
  canReturnValues : true,
  escapeInserts : true
};

/**
 * Manage a connection to an OrientDB Server
 *
 * @param {Object} config
 * @param {Object} collections
 * @param {Function} callback
 * @return {Object} 
 * @api private
 */
var Connection = module.exports = function Connection(config, collections, cb) {
  var self = this;
  
  // holds the adapter config
  this.config = config;
  
  // holds an associations object used for joins
  this.associations = new Associations(self);
  
  // Hold the waterline schema, used by query namely waterline-sequel-orientdb
  this.waterlineSchema = _.values(collections)[0].waterline.schema;
  
  // update sqlOptions config and instantiate a sequel helper
  sqlOptions.parameterized = self.config.options.parameterized;
  this.sequel = new Sequel(self.waterlineSchema, sqlOptions);
  
  // holds existing classes from OrientDB
  this.dbClasses = {};
  
  // Holds a registry of collections (indexed by tableName)
  this.collections = {};
  
  // Holds a registry of collections (indexed by identity)
  this.collectionsByIdentity = {};
  
  // hold an instance of oriento
  this.server = null;
  
  // aux variables used to figure out when all collections have been synced
  this._collectionSync = {
    modifiedCollections: [],
    postProcessed: false,
    itemsToProcess: _.clone(collections)
  };
  
  self._init(config, collections, cb);
};
      

/////////////////////////////////////////////////////////////////////////////////
// PUBLIC METHODS
/////////////////////////////////////////////////////////////////////////////////


/**
 * Describe
 *
 * @param {String} collectionName
 * @param {Function} callback
 */
Connection.prototype.describe = function describe(collectionName, cb) {
  var self = this;
  
  if(self._collectionSync.itemsToProcess[collectionName]){
    delete self._collectionSync.itemsToProcess[collectionName];
  }
  
  var collection = self.collections[collectionName];
  if(!collection.databaseClass) { return cb(); }
  
  var schema = {};
  
  collection.databaseClass.property.list()
    .then(function(properties){
      
      // TODO: don't copy collection.schema blindly, check mandatory and indices!
      _.forEach(properties, function(property){
        if(collection.schema[property.name]){
          schema[property.name] = collection.schema[property.name];
        }
        // else {
          // // TODO: include properties found in database which are not in collection.schema
        // }
      });
      
      if(collection.schema.id){
        schema.id = collection.schema.id;
      }
      
      // describting last collection and it exists, calling postProcessing now as there won't
      // be a subsequent call to define
      if(Object.keys(self._collectionSync.itemsToProcess).length === 0){
        self.postProcessing(function(err){
          if(err){ return cb(err); }
          cb(null, schema);
        });
      } else {
        cb(null, schema);
      }
    });
    
    // TODO: fetch indexes
};
    

/**
 * Create Collection
 *
 * @param {String} collectionName
 * @param {Object} definition
 * @param {Function} cb
 */
Connection.prototype.createCollection = function createCollection(collectionName, definition, cb) {
  var self = this;
  
  var collection = self.collections[collectionName];
  
  // Class exists?
  if (collection.databaseClass) {
    // TODO: properties may need updating ?
    if(Object.keys(self._collectionSync.itemsToProcess).length === 0){
      return self.postProcessing(function(err){
          if(err){ return cb(err); }
          cb(null, collection.schema);
        });
    } else {
      return cb(null, collection.schema);
    }
  }

  // No, lets create it
  self.db.class.create(collection.tableName, collection.superClass)
    .then(function(klass) {
     
      collection.databaseClass = klass;
      
      self._collectionSync.modifiedCollections.push(collection);
      
      // Create properties
      var props = _.values(collection.orientdbSchema);
      if(props.length > 0){
        return klass.property.create(props);
      }
    })
    .then(function(){
      // Create transformations
      function transformer(data) {
        var newData = {};
        var keys = Object.keys(data), length = keys.length, key, i;
        for ( i = 0; i < length; i++) {
          key = keys[i];
          newData[key] = data[key];
        }
        return newData;
      }
      self.db.registerTransformer(collectionName, transformer);
      
      // Create Indexes
      self._ensureIndexes(collection.databaseClass, collection.indexes, function(err/*, result*/){
        if(err) { return cb(err); }
        
        // Post process if all collections have been processed
        if(Object.keys(self._collectionSync.itemsToProcess).length === 0){
          self.postProcessing(function(err){
            if(err){ return cb(err); }
            cb(null, collection.schema);
          });
        } else {
          cb(null, collection.schema);
        }
      });
    })
    .catch(function(err){
      log.error('failed while creating', collectionName, ':', err);
      cb(err);
    }); 
};


/**
 * Add a property to a class
 */
Connection.prototype.addAttribute = function(collectionName, attrName, attrDef, cb) {
  var self = this;
  
  var collection = self.collections[collectionName];
  
  var prop;
  
  if(collection.orientdbSchema[attrName]){
    prop = collection.orientdbSchema[attrName];
  } else {
    prop = {
      name : attrName,
      type : attrDef.type
    };
  }
  
  collection.databaseClass.property.create(prop).then(function(err, property){
    cb(null, property);
  })
  .error(cb);
};


/**
 * Post Processing
 * 
 * called after all collections have been created
 */
Connection.prototype.postProcessing = function postProcessing(cb){
  var self = this;
  
  if(self._collectionSync.postProcessed) {
    log.debug('Attempted to postprocess twice. This shouln\'t happen, try to improve the logic behind this.'); 
    return cb();
  }
  self._collectionSync.postProcessed = true;

  log.info('All classes created, post processing');
  
  function createLink(collection, complete){
    async.each(collection.links, function(link, next){
      var linkClass = collection.databaseClass;
      var linkedClass = self.collections[link.linkedClass];

      linkClass.property.update({
        name : link.attributeName,
        linkedClass : linkedClass.tableName
      })
      .then(function(dbLink){
        next(null, dbLink);
      })
      .error(next);
    }, complete);
  }
  
  async.each(self._collectionSync.modifiedCollections, createLink, cb);
};


/**
 * query
 * 
 * exposes Oriento's query
 */
Connection.prototype.query = function(query, options, cb) {
  if (options && !cb) {
    cb = options;
    options = undefined;
  }

  this.db.query(query, options)
    .all()
    .then(function(res) {
      cb(null, utils.rewriteIdsRecursive(res));
    })
    .error(cb);
};


/**
 * returns the oriento collection object
 */
Connection.prototype.native = function(collection, cb) {
  if(cb){
    cb(this.collections[collection].databaseClass);
  }
  return this.collections[collection].databaseClass;
};


/**
 * returns the oriento db object
 */
Connection.prototype.getDB = function(cb) {
  if(cb){
    cb(this.db);
  }
  return this.db;
};

/**
 * returns the oriento object
 */
Connection.prototype.getServer = function(cb) {
  if(cb){
    cb(this.server);
  }
  return this.server;
}; 

/**
 * returns a select query with run function query and params
 */
Connection.prototype.runFunction = function(functionName, args) {
  var query = functionName + '(';
  var params = {};

  var i;
  for (i=0; i<args.length; i++){
    query += i === 0 ? '' : ', ';
    query += ':param' + i;
    params['param' + i] = args[i];
  }
  query += ')';
  
  return this.db.select(query).addParams(params);
};

/**
 * Retrieves records of class collection that fulfill the criteria in options
 */
Connection.prototype.find = function(collection, options, cb) {
  this.collections[collection].find(options, cb);
};


/**
 * Deletes a collection from database
 */
Connection.prototype.drop = function (collectionName, relations, cb) {
  this.collections[collectionName].drop(relations, cb);
};


/**
 * Creates a new document from a collection
 */
Connection.prototype.create = function(collection, options, cb) {
  this.collections[collection].insert(options, cb);
};
  

/**
 * Updates a document from a collection
 */
Connection.prototype.update = function(collection, options, values, cb) {
  this.collections[collection].update(options, values, cb);
}; 


/*
 * Deletes a document from a collection
 */
Connection.prototype.destroy = function(collection, options, cb) {
  this.collections[collection].destroy(options, cb);
};

/*
 * Peforms a join between 2-3 orientdb collections
 */
Connection.prototype.join = function(collection, options, cb) {
  var self = this;
  
  self.associations.join(collection, options, function(err, results){
    if(err) { return cb(err); }
    if(self.config.options.removeCircularReferences){
      utils.removeCircularReferences(results);
    }
    cb(null, results);
  });
};

/*
 * Creates edge between two vertices pointed by from and to
 * Keeps the same interface as described in:
 * https://github.com/codemix/oriento/blob/6b8c40e7f1f195b591b510884a8e05c11b53f724/README.md#creating-an-edge-with-properties
 * 
 */
Connection.prototype.createEdge = function(from, to, options, cb) {
  var schema,
      klass = 'E';
  cb = cb || _.noop;
  options = options || {};
  
  if(options['@class']){
    klass = options['@class'];
    schema = this.collections[klass] && this.collections[klass].schema;
  }

  this.db.create('EDGE', klass).from(from).to(to)
    .set(options)
    .one()
    .then(function(res) {
      cb(null, utils.rewriteIds(res, schema));
    })
    .error(cb);
};


/*
 * Removes edges between two vertices pointed by from and to
 */
Connection.prototype.deleteEdges = function(from, to, options, cb) {
  cb = cb || _.noop;
      
  if(!options){
    return this.db.delete('EDGE').from(from).to(to).scalar()
      .then(function(count) {
        cb(null, count);
      });
  }
  
  // temporary workaround for issue: https://github.com/orientechnologies/orientdb/issues/3114
  var className = _.isString(options) ? options : options['@class'];
  var command = 'DELETE EDGE FROM ' + from + ' TO ' + to + " where @class = '" + className + "'";
  this.db.query(command)
    .then(function(count) {
        cb(null, count);
      });
};

  
  
/////////////////////////////////////////////////////////////////////////////////
// PRIVATE METHODS
/////////////////////////////////////////////////////////////////////////////////

/**
 * Ensure Indexes
 *
 * @param {Object} oriento class
 * @param {Array} indexes
 * @param {Function} callback
 * @api private
 */
Connection.prototype._ensureIndexes = function _ensureIndexes(collection, indexes, cb) {
  if(!indexes || indexes.length === 0) { return cb(); }

  this.db.index.create(indexes)
    .then(function(res){ cb(null, res); })
    .error(cb);
};


/**
 * Initialize a connection
 * 
 * @param {Object} config
 * @param {Object} collections
 * @param {Object} cb
 */
Connection.prototype._init = function _init(config, collections, cb) {
  var self = this;
  
  this.server = self._getOriento(config);
  
  function ensureDbAndListClasses(done){
    self._ensureDB(config)
      .then(function(database){
        self.db = database;
        return database.class.list();
      })
      .then(function(classes){
        done(null, classes);
      })
      .catch(done);
  }
  
  function initializeCollections(done){
    self._initializeCollections(collections);
    done();
  }
  
  async.parallel({
    classes : ensureDbAndListClasses,
    collections : initializeCollections
  }, function(err, results){
    if(err) { return cb(err); }
  
    results.classes.forEach(function(klass){
      self.dbClasses[klass.name] = klass;
    });
    
    _.values(self.collections).forEach(function(collection) {
      // has to run after collection instatiation due to tableName redefinition on edges
      collection.databaseClass = self.dbClasses[collection.tableName];
    });
    
    cb();
    
  });
};

/**
 * Prepares and oriento config and creates a new instance
 * 
 * @param {Object} config
 */
Connection.prototype._getOriento = function _getOriento(config) {
  var orientoOptions = {
    host : config.host,
    port : config.host,
    username : config.user,
    password : config.password,
    transport : config.options.transport,
    enableRIDBags : false,
    useToken : false,
    logger : config.options.orientoLogger
  };
  
  return new Oriento(orientoOptions);
};

/**
 * Check if a database exists and if not, creates one
 * 
 * @param {Object} config
 */
Connection.prototype._ensureDB = function _ensureDB (config) {
  var self = this;
  
  log.info('Connecting to database...');
  
  var dbOptions = typeof config.database === 'object' ? config.database : { name: config.database };
  dbOptions.username = config.options.databaseUser || config.user;
  dbOptions.password = config.options.databasePassword || config.password;
  dbOptions.storage = config.options.storage;
  dbOptions.type = config.options.databaseType;

  return self.server.list()
    .then(function(dbs) {
      var dbExists = _.find(dbs, function(db) {
        return db.name === dbOptions.name;
      });
      if (dbExists) {
        log.info('Database ' + dbOptions.name + ' found.');
        return self.server.use(dbOptions);
      } else {
        log.info('Database ' + dbOptions.name + ' not found, will create it.');
        return self.server.create(dbOptions);
      }
    });
};
    
/**
 * Initializes the database collections
 * 
 * @param {Object} collections
 */
Connection.prototype._initializeCollections = function _initializeCollections(collections) {
  var self = this;
  
  var collectionsByIdentity = _.reduce(collections, function(accumulator, collection){
    accumulator[collection.identity] = collection;
    return accumulator;
  }, {});
  
  Object.keys(collections).forEach(function(key) {
    self.collections[key] = new Collection(collections[key], self, collectionsByIdentity);
    self.collectionsByIdentity[self.collections[key].identity] = self.collections[key];
  });
};

