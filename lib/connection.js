"use strict";
/*jshint maxlen: 200 */
var Oriento = require('oriento'),
    Q = require('q'),
    async = require('async'),
    _ = require('lodash'),
    utils = require('./utils'),
    Associations = require('./associations'),
    log = require('debug-logger')('waterline-orientdb:connection'),
    Collection = require('./collection');


module.exports = (function () {

    var defaults = {
        createCustomIndex: false,
        idProperty: 'id',
        options: {
          fetchPlanLevel: 1,
          parameterized: false
        }
    },
    dbDefaults = {
      type: 'graph',
      storage: 'plocal'
    },
    server,
    
    DbHelper = function (db, collections, config, classes) {
        var self = this;
        this.db = db;
        this.collectionsByIdentity = _.reduce(collections, function(accumulator, collection){
          accumulator[collection.identity] = collection;
          return accumulator;
        }, {});
        var auxDefaults = _.merge({}, defaults);
        this.config = _.merge(auxDefaults, config);
        this.associations = new Associations(this);
        this.server = server;
        
        this.dbClasses = {};
        classes.forEach(function(klass){
          self.dbClasses[klass.name] = klass;
        });
        
        // Build up a registry of collections
        this.collections = {};
        Object.keys(collections).forEach(function(key) {
          self.collections[key] = new Collection(collections[key], self, self.dbClasses[key], self.collectionsByIdentity);
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
      dbProps = _.extend({}, dbDefaults, dbProps);
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
  
      if (!server) {
        log.info('Connecting to database...');
        server = new Oriento(orientoConnection);
      }
  
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
    
    // TODO: Fetch properties from db and generate a schema
    var collectionInstance = self.collections[collectionName];
    if(collectionInstance.databaseClass) {
      cb(null, collectionInstance.schema);
      if(Object.keys(self.collectionSync.itemsToProcess).length === 0){
        self.postProcessing();
      }
    }
    cb();
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
      if(Object.keys(self.collectionSync.itemsToProcess).length === 0){ self.postProcessing(); }
      return cb(null, collection.databaseClass);
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
        
        if(Object.keys(self.collectionSync.itemsToProcess).length === 0){ self.postProcessing(); }
        
        // Create Indexes
        self._ensureIndexes(klass, collection.indexes, cb);
      }); 
  };
  
  
  /**
   * Post Processing
   * 
   * called after all collections have been created
   */
  DbHelper.prototype.postProcessing = function postProcessing(){
    var self = this;
    
    if(self.collectionSync.postProcessed) {
      log.debug('Attempted to postprocess twice. This shouln\'t happen, try to improve the logic behind this.'); 
      return;
    }
    self.collectionSync.postProcessed = true;

    log.info('All classes created, post processing');
    
    self.collectionSync.modifiedCollections.forEach(function(collection){
      collection.links.forEach(function(link){
        var linkClass = collection.databaseClass;
        var linkedClass = self.collections[link.linkedClass];
  
        linkClass.property.update({
          name : link.attributeName,
          linkedClass : linkedClass.tableName
        })
        .error(function(err){
          log.error('Failed to create link', err);
        });
      });
    });

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
   * getDB
   * 
   * returns the oriento db object
   */
  DbHelper.prototype.getDB = function(cb) {
    return cb(this.db);
  };

  DbHelper.prototype.getServer = function(cb) {
    return cb(this.server);
  }; 

    
  /**
   * Retrieves records of class collection that fulfill the criteria in options
   */
  DbHelper.prototype.find = function(collection, options, cb) {
    this.collections[collection].find(options, cb);
  };


    //Deletes a collection from database
    DbHelper.prototype.drop = function (collection, relations, cb) {

    //return this.db.class.drop(collection)
    return this.db.query('DROP CLASS ' + collection + ' UNSAFE')
            .then(function (res) {
                cb(null, res);
            })
            .error(cb);
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
  
    async.each(indexes, createIndex, function(err/*, indices*/){
      if(err) { return cb(err); }
      cb(null, collection);
    });
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
