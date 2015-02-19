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
            this.collections = collections;
            this.collectionsByIdentity = _.reduce(collections, function(accumulator, collection){
              accumulator[collection.identity] = collection;
              return accumulator;
            }, {});
            var auxDefaults = _.merge({}, defaults);
            this.config = _.merge(auxDefaults, config);
            this.associations = new Associations(this);
            this.server = server;
            
            var dbClasses = {};
            classes.forEach(function(klass){
              dbClasses[klass.name] = klass;
            });
            this.dbClasses = dbClasses;
            
            // Build up a registry of collections
            var context = this;
            this.newCollections = {};  // TODO: replace this.collections
            Object.keys(collections).forEach(function(key) {
              context.newCollections[key] = new Collection(collections[key], context, dbClasses[key], self.collectionsByIdentity);
            });
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
    DbHelper.prototype._classes = null;


    DbHelper.prototype.ensureIndex = function () {
        log.debug('Creating indices...', Object.keys(this), this.config);
        var deferred = Q.defer(),
            db = this.db,
            idProp = this.config.idProperty,
            indexName = 'V.' + idProp;

        async.auto({
                getVClass: function (next) {

                    db.class.get('V')
                        .then(function (klass, err) {
                            next(err, klass);
                        });
                },
                getProps: ['getVClass',
                        function (next, results) {
                        var klass = results.getVClass;
                        klass.property.list()
                            .then(function (properties, err) {
                                next(err, properties);
                            });
                }],
                getIdProp: ['getProps',
                    function (next, results) {
                        var klass = results.getVClass,
                            properties = results.getProps,
                            prop = _.findWhere(properties, {
                                name: idProp
                            });

                        if (!prop) {
                            klass.property.create({
                                name: idProp,
                                type: 'String'
                            }).then(function (property, err) {
                                next(err, property);
                            });
                            return;
                        }
                        next(null, prop);
                        }],
                ensureIndex: ['getIdProp',
                    function (next) {

                        var createIndex = function (err) {
                            if (err) {
                                db.index.create({
                                    name: indexName,
                                    type: 'unique'
                                }).then(function (index, err) {
                                    next(err, true);
                                });
                                return;
                            }
                        };

                        db.index.get(indexName)
                            .error(createIndex)
                            .done(function (index, err) {
                                //if index not found then create it
                                return index && next(err, true);
                            });
                    }]
            },
            function (err, results) {
                if (err) {
                    log.error('error while creating indices', err);
                    deferred.reject(err);
                    return;
                }
                log.debug('indices created.');
                deferred.resolve(results);
            });
        return deferred.promise;

    };
    
    
    /*Makes sure that all the collections are synced to database classes*/
    DbHelper.prototype.registerCollections = function () {
        var deferred = Q.defer(),
            me = this,
            db = me.db,
            collections = this.collections,
            linksToBeCreated = [];

        async.auto({
          
                ensureIndex: function (next) {
                   if (me.config.createCustomIndex) {
                       me.ensureIndex().then(function (indexEnsured, err) {
                           next(err, indexEnsured);
                       });
                       return;
                   }
                    next(null, true);
                },
                
                getClasses: ['ensureIndex',
                function (next) {
                      db.class.list().then(function (classes, err) {
                        next(err, classes);
                    });
                }],
                
                registerClasses: ['getClasses',
                  function (complete, results) {
                        var classes = results.getClasses,
                            klassesToBeAdded = _.filter(collections, function (v, k) {
                                return _.isUndefined(_.find(classes, function (klass) {
                                    return k == klass.name;
                                }));
                            });

                        if (klassesToBeAdded.length > 0) {

                            async.mapSeries(klassesToBeAdded, function (collection, next) {
                              var tableName = collection.tableName || collection.identity;
                                    var collectionClass = collection.edge || utils.isJunctionTableThrough(collection) ? 'E' : 'V';

                                    db.class
                                        .create(tableName, collectionClass)
                                        .then(function (klass, err) {
                                            //TODO: refactor: move this to own method!!!
                                            // Create OrientDB schema
                                            if (collection.attributes){
                                              log.debug('Creating DB class [' + tableName + '] for collection [' + collection.identity + ']');
                                              Object.keys(collection.attributes).forEach(function(attributeName){
                                                if(attributeName === 'id'){
                                                  // @rid is the equivalent of id, no need to add id.
                                                  return;
                                                }
                                                var linkedClass = null,
                                                    attributeType = null,
                                                    columnName = attributeName;
                                                if(typeof collection.attributes[attributeName] === 'string')
                                                  attributeType = collection.attributes[attributeName];
                                                else if (typeof collection.attributes[attributeName] === 'function')
                                                  return;
                                                else if (collection.attributes[attributeName].model || collection.attributes[attributeName].references){
                                                  linkedClass = collection.attributes[attributeName].model || collection.attributes[attributeName].references;
                                                  var useLink = me.collectionsByIdentity[linkedClass].primaryKey === 'id';
                                                  attributeType = useLink ? 'Link' : collection.pkFormat;
                                                }
                                                else if (collection.attributes[attributeName].foreignKey){
                                                  attributeType = 'Link';
                                                }
                                                else if (collection.attributes[attributeName].collection){
                                                  attributeType = 'linkset';
                                                  linkedClass = collection.attributes[attributeName].collection;
                                                }
                                                else
                                                  attributeType = collection.attributes[attributeName].type;
                                                
                                                if (attributeType === 'array')
                                                  attributeType = 'embeddedlist';
                                                else if (attributeType === 'json')
                                                  attributeType = 'embedded';
                                                else if (attributeType === 'text')
                                                  attributeType = 'string';
                                                  
                                                if(collection.attributes[attributeName].columnName)
                                                  columnName = collection.attributes[attributeName].columnName;
                                                
                                                //log.debug('attributeType for ' + attributeName + ':', attributeType);
                                                
                                                if(attributeType){
                                                  var prop = {
                                                    name: columnName,
                                                    type: attributeType
                                                  };
                                                  if(!!collection.attributes[attributeName].required) {
                                                    prop.mandatory = true;
                                                  }
                                                  klass.property.create(prop).then(function(){
                                                    if(!!collection.attributes[attributeName].unique){
                                                      db.index.create({
                                                        name: tableName + '.' + columnName,
                                                        type: 'unique'
                                                      });
                                                    } else if(!!collection.attributes[attributeName].index){
                                                      db.index.create({
                                                        name: tableName + '.' + columnName,
                                                        type: 'notunique'
                                                      });
                                                    }
                                                  });
                                                  if(attributeType.toLowerCase().indexOf('link') === 0 && linkedClass)
                                                    linksToBeCreated.push({
                                                      attributeName: columnName,
                                                      klass: klass,
                                                      linkedClass: linkedClass
                                                    });
                                                }
                                              });
                                            }
                                            next(err, klass);
                                        });
                                },
                                function (err, created) {
                                    complete(err, created);
                                });
                            return;
                        }
                        complete(null, classes);
                  }],
                
                setClasses: ['registerClasses',
                  function(complete, results){
                    var allClasses = (results.getClasses || []).concat(results.registerClasses);
                    
                    //flatten the array of classes to key value pairs to ease the retrieval of classes
                    me._classes = _.reduce(allClasses, function (initial, klass) {
    
                        var collection = _.find(me.collections, function (v) {
                            return (v.tableName || v.identity) === klass.name;
                        });
                        //If a matching collection is found then store the class reference using the collection name else use class name itself
                        initial[(collection && collection.identity) || klass.name] = klass;
                        return initial;
                    }, {});
                    
                    complete(null, me._classes);
                  }
                ],
                
                registerLinks: ['setClasses', 
                  function (complete, results) {
                    
                    async.map(linksToBeCreated, function (link, next) {
                      var linkedClass = results.setClasses[link.linkedClass];
                      link.klass.property.update({
                    name: link.attributeName,
                    linkedClass: linkedClass.name
                  })
                  .then(function(){
                    next(null, link.klass);
                  })
                  .error(next);
                      }, 
                      function (err, created) {
                        complete(err, created);
                      });
                  }],
                  
                rgisterTransformers: ['setClasses', function (complete, results) {
                  // TODO: this should not be done in such a generic fashion, but truth is
                  // we currently need this for fetch plans to work. We probably should use these transformers
                  // inside a collection class such as, e.g. https://github.com/balderdashy/sails-mongo/blob/master/lib/collection.js
                  // For an example of a transformer, look at: https://github.com/codemix/oriento/blob/aa6257d31d1b873cc19ee07df84e162ea86ff998/test/db/db-test.js#L79
                  
                  function transformer (data) {
                    var newData = {};
                    var keys = Object.keys(data),
                        length = keys.length,
                        key, i;
                    for (i = 0; i < length; i++) {
                      key = keys[i];
                      newData[key] = data[key];
                    }
                    return newData;
                  }
                  
                  var klasses = results.setClasses;
                  Object.keys(klasses).forEach(function(klassKey){
                    db.registerTransformer(klasses[klassKey].name, transformer);
                  });
                  complete();
                  
                }]
            },
            function (err, results) {
                if (err) {
                    deferred.reject(err);
                    return;
                }

                deferred.resolve(results.registerClasses);
            });
        return deferred.promise;
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
    this.newCollections[collection].find(options, cb);
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
    this.newCollections[collection].insert(options, cb);
  };
    

  /**
   * Updates a document from a collection
   */
  DbHelper.prototype.update = function(collection, options, values, cb) {
    this.newCollections[collection].update(options, values, cb);
  }; 


  /*
   * Deletes a document from a collection
   */
  DbHelper.prototype.destroy = function(collection, options, cb) {
    this.newCollections[collection].destroy(options, cb);
  };


  /*
   * Creates edge between two vertices pointed by from and to
   * Keeps the same interface as described in:
   * https://github.com/codemix/oriento/blob/6b8c40e7f1f195b591b510884a8e05c11b53f724/README.md#creating-an-edge-with-properties
   * 
   */
  DbHelper.prototype.createEdge = function(from, to, options, cb) {
    var attributes,
        klass = 'E';
    cb = cb || _.noop;
    options = options || {};
    
    if(options['@class']){
      klass = options['@class'];
      attributes = this.collections[klass] && this.collections[klass].attributes;
    }

    this.db.create('EDGE', klass).from(from).to(to)
      .set(options)
      .one()
      .then(function(res) {
        cb(null, utils.rewriteIds(res, attributes));
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
          
          helper.registerCollections()
            .then(function() {
              d.resolve(helper);
            });
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
