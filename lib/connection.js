"use strict";
/*jshint maxlen: 200 */
var Oriento = require('oriento'),
    Q = require('q'),
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

module.exports = (function () {

    var server,
    
    DbHelper = function (db, collections, config, classes) {
        var self = this;
        this.db = db;
        var collectionsByIdentity = _.reduce(collections, function(accumulator, collection){
          accumulator[collection.identity] = collection;
          return accumulator;
        }, {});
        this.config = config;
        this.associations = new Associations(this);
        this.server = server;
        
        // update sqlOptions config
        sqlOptions.parameterized = _.isUndefined(this.config.options.parameterized) ?
                                   sqlOptions.parameterized : this.config.options.parameterized;
        // Hold the waterline schema, used by query namely waterline-sequel-orientdb
        this.waterlineSchema = _.values(collections)[0].waterline.schema;
        
        // Instantiate a sequel helper
        this.sequel = new Sequel(this.waterlineSchema, sqlOptions);
        
        // Stores existings classes from OrientDB
        this.dbClasses = {};
        classes.forEach(function(klass){
          self.dbClasses[klass.name] = klass;
        });
        
        // Build up a registry of collections
        this.collections = {};
        this.collectionsByIdentity = {};
        Object.keys(collections).forEach(function(key) {
          self.collections[key] = new Collection(collections[key], self, collectionsByIdentity);
          self.collectionsByIdentity[self.collections[key].identity] = self.collections[key];
        });
        
        _.values(self.collections).forEach(function(collection) {
          // has to run after collection instatiation due to tableName redefinition on edges
          collection.databaseClass = self.dbClasses[collection.tableName];
        });
        
        // aux variables used to figure out when all collections have been synced 
        this.collectionSync =  {
          modifiedCollections: [],
          postProcessed: false,
          itemsToProcess: _.clone(collections)
        };
    },
    
    ensureDB = function (connectionProps) {
      var dbProps = (typeof connectionProps.database === 'object') ? connectionProps.database : { name: connectionProps.database };
      dbProps.username = connectionProps.user;
      dbProps.password = connectionProps.password;
      if(connectionProps.options.storage){
        dbProps.storage = connectionProps.options.storage;
      }
      if(connectionProps.options.databaseType){
        dbProps.type = connectionProps.options.databaseType;
      }
      var deferred = Q.defer();
      log.debug('Looking for database', connectionProps.database);

      server.list()
        .then(function(dbs) {
          var dbExists = _.find(dbs, function(db) {
            return db.name === dbProps.name;
          });
          if (dbExists) {
            log.debug('database found.');
            deferred.resolve(server.use(dbProps));
          } else {
            log.debug('database not found, will create it.');
            server.create(dbProps).then(function(db) {
              deferred.resolve(db);
            });
          }
        });

      return deferred.promise;
    },
    getDb = function (connection) {
      var orientoConnection = {
        host : connection.host,
        port : connection.host,
        username : connection.user,
        password : connection.password,
        transport : connection.transport || 'binary',
        enableRIDBags : false,
        useToken : false
      };
  
     //if (!server) {
        log.info('Connecting to database...');
        server = new Oriento(orientoConnection);
     //}
  
      return ensureDB(connection);
    };

    DbHelper.prototype.db = null;
    DbHelper.prototype.collections = null;
    DbHelper.prototype.config = null;

    
  /**
   * Describe
   *
   * @param {String} collectionName
   * @param {Function} callback
   */
  DbHelper.prototype.describe = function describe(collectionName, cb) {
    var self = this;
    
    if(self.collectionSync.itemsToProcess[collectionName]){
      delete self.collectionSync.itemsToProcess[collectionName];
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
        if(Object.keys(self.collectionSync.itemsToProcess).length === 0){
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
  DbHelper.prototype.createCollection = function createCollection(collectionName, definition, cb) {
    var self = this;
    
    var collection = self.collections[collectionName];
    
    // Create the Collection
    if (collection.databaseClass) {
      // TODO: properties may need updating ?
      if(Object.keys(self.collectionSync.itemsToProcess).length === 0){
        return self.postProcessing(function(err){
            if(err){ return cb(err); }
            cb(null, collection.schema);
          });
      } else {
        return cb(null, collection.schema);
      }
    }

    self.db.class.create(collection.tableName, collection.superClass)
      .then(function(klass, err) {
        if (err) { log.error('db.class.create: ' + err); } 
  
        collection.databaseClass = klass;
        
        self.collectionSync.modifiedCollections.push(collection);
        
        // Create properties
        _.values(collection.orientdbSchema).forEach(function(prop) {
          klass.property.create(prop).then();
        });
        
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
        self._ensureIndexes(klass, collection.indexes, function(err/*, result*/){
          if(err) { return cb(err); }
          
          // Post process if all collections have been processed
          if(Object.keys(self.collectionSync.itemsToProcess).length === 0){
            self.postProcessing(function(err){
              if(err){ return cb(err); }
              cb(null, collection.schema);
            });
          } else {
            cb(null, collection.schema);
          }
        });
      }); 
  };
  
  
  /**
   * Add a property to a class
   */
  DbHelper.prototype.addAttribute = function(collectionName, attrName, attrDef, cb) {
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
  DbHelper.prototype.postProcessing = function postProcessing(cb){
    var self = this;
    
    if(self.collectionSync.postProcessed) {
      log.debug('Attempted to postprocess twice. This shouln\'t happen, try to improve the logic behind this.'); 
      return cb();
    }
    self.collectionSync.postProcessed = true;

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
    
    async.each(self.collectionSync.modifiedCollections, createLink, cb);
  };


  /**
   * query
   * 
   * exposes Oriento's query
   */
  DbHelper.prototype.query = function(query, options, cb) {
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
  DbHelper.prototype.native = function(collection, cb) {
    return cb(this.collections[collection].databaseClass);
  };


  /**
   * returns the oriento db object
   */
  DbHelper.prototype.getDB = function(cb) {
    return cb(this.db);
  };

  /**
   * returns the oriento object
   */
  DbHelper.prototype.getServer = function(cb) {
    return cb(this.server);
  }; 

    
  /**
   * Retrieves records of class collection that fulfill the criteria in options
   */
  DbHelper.prototype.find = function(collection, options, cb) {
    this.collections[collection].find(options, cb);
  };


  /**
   * Deletes a collection from database
   */
  DbHelper.prototype.drop = function (collectionName, relations, cb) {
    this.collections[collectionName].drop(relations, cb);
  };


  /**
   * Creates a new document from a collection
   */
  DbHelper.prototype.create = function(collection, options, cb) {
    this.collections[collection].insert(options, cb);
  };
    

  /**
   * Updates a document from a collection
   */
  DbHelper.prototype.update = function(collection, options, values, cb) {
    this.collections[collection].update(options, values, cb);
  }; 


  /*
   * Deletes a document from a collection
   */
  DbHelper.prototype.destroy = function(collection, options, cb) {
    this.collections[collection].destroy(options, cb);
  };


  /*
   * Creates edge between two vertices pointed by from and to
   * Keeps the same interface as described in:
   * https://github.com/codemix/oriento/blob/6b8c40e7f1f195b591b510884a8e05c11b53f724/README.md#creating-an-edge-with-properties
   * 
   */
  DbHelper.prototype.createEdge = function(from, to, options, cb) {
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
  DbHelper.prototype.deleteEdges = function(from, to, options, cb) {
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
  
  DbHelper.prototype._ensureIndexes = function _ensureIndexes(collection, indexes, cb) {
    var self = this;
  
    function createIndex(item, next) {
      self.db.index.create(item)
        .then(function(index){ next(null, index); })
        .error(next);
    }
  
    async.each(indexes, createIndex, cb);
  };
  

  

  var connect = function(connection, collections) {
    // if an active connection exists, use
    // it instead of tearing the previous
    // one down
    var d = Q.defer();

    try {
      var database;
      getDb(connection, collections)
        .then(function(db) {
          database = db;
          return db.class.list();
        })
        .then(function(classes){
          var helper = new DbHelper(database, collections, connection, classes);
          d.resolve(helper);
        });
            
    } catch (err) {
      log.error('An error has occured while trying to connect to OrientDB.', err);
      d.reject(err);
      throw err;
    }
    return d.promise;

  };

  return {
    create : function(connection, collections) {
      return connect(connection, collections);
    }
  };


})();
