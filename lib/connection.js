var Oriento = require('oriento'),
    Q = require('q'),
    async = require('async'),
    _ = require('lodash'),
    utils = require('./utils'),
    Query = require('./query'),
    Document = require('./document'),
    Associations = require('./associations'),
    log = require('./logger')('waterline-orientdb:connection');


module.exports = (function () {

    'use strict';

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
        transformers = {
            '@rid': function (rid) {
                return '#' + rid.cluster + ':' + rid.position;
            }
        },
        dbHelper = function (db, collections, config) {
            this.db = db;
            this.collections = collections;
            this.collectionsByIdentity = _.reduce(collections, function(accumulator, collection){
              accumulator[collection.identity] = collection;
              return accumulator;
            }, {});
            var auxDefaults = _.merge({}, defaults);
            this.config = _.merge(auxDefaults, config);
            this.associations = new Associations(this);
        },
        ensureDB = function (database) {
          var dbProps = (typeof database === 'object') ? database : { name: database };
          dbProps = _.extend({}, dbDefaults, dbProps);
            var deferred = Q.defer();
            server.list().then(function (dbs) {
                var dbExists = _.find(dbs, function (db) {
                    return db.name === dbProps.name;
                });
                if (dbExists) {
                    deferred.resolve(server.use(dbProps));
                } else {
                    server.create(dbProps).then(function (db) {
                        deferred.resolve(db);
                    });
                }


            });

            return deferred.promise;
        },
        getDb = function (connection) {
 
      var orientoConnection = {
              host: connection.host,
              port: connection.host,
              username: connection.username,
              password: connection.password,
              transport: connection.transport || 'binary'
              enableRIDBags: false,
      };

            if (!server)
                server = Oriento(orientoConnection);

            return ensureDB(connection.database);

        },
        findCollectionByName = function (collections, collectionName) {
            return _.find(collections, function (v, k) {
                return k.toLowerCase() == collectionName.toLowerCase();
            });
        };

    dbHelper.prototype.db = null;
    dbHelper.prototype.collections = null;
    dbHelper.prototype.config = null;
    dbHelper.prototype._classes = null;

    dbHelper.prototype.getClass = function (collection) {
        return this._classes[collection];
    };


    dbHelper.prototype.ensureIndex = function () {
        var deferred = Q.defer(),
            db = this.db,
            idProp = this.config.idProperty,
            indexName = 'V.' + idProp;

        async.auto({
                getVClass: function (next, results) {

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
                    function (next, results) {

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
                                index && next(err, true);
                            });
                    }]
            },
            function (err, results) {
                if (err) {
                    deferred.reject(err);
                    return;
                }
                deferred.resolve(results);
            });
        return deferred.promise;

    };
    

    /*Makes sure that all the collections are synced to database classes*/
    dbHelper.prototype.registerCollections = function () {
        var deferred = Q.defer(),
            me = this,
            db = me.db,
            collections = this.collections,
            linksToBeCreated = [];

        async.auto({
          
                ensureIndex: function (next, results) {
                    if (me.config.createCustomIndex) {
                        me.ensureIndex().then(function (indexEnsured, err) {
                            next(err, indexEnsured);
                        });
                        return;
                    }
                    next(null, true);
                },
                
                getClasses: ['ensureIndex',
                function (next, results) {
                      db.class.list().then(function (classes, err) {
                        next(err, classes);
                    });
                }],
                
                registerClasses: ['getClasses',
                  function (complete, results) {
                        var classes = results.getClasses,
                            klassesToBeAdded = _.filter(collections, function (v, k) {
                                return _.find(classes, function (klass) {
                                    return k == klass.name;
                                }) == null;
                            });

                        if (klassesToBeAdded.length > 0) {

                            async.mapSeries(klassesToBeAdded, function (collection, next) {
                              var tableName = collection.tableName || collection.identity;
                                    var collectionClass = utils.isJunctionTableThrough(collection) ? 'E' : 'V';

                                    db.class
                                        .create(tableName, collectionClass)
                                        .then(function (klass, err) {
                                            //TODO: refactor: move this to own method!!!
                                            // Create OrientDB schema
                                            if (collection.attributes){
                                              var attributeName;
                                              for(attributeName in collection.attributes){
                                                var linkedClass = null,
                                                    attributeType = null,
                                                    columnName = attributeName;
                                                if(typeof collection.attributes[attributeName] === 'string')
                                                  attributeType = collection.attributes[attributeName];
                                                else if (typeof collection.attributes[attributeName] === 'function')
                                                  continue;
                                                else if (collection.attributes[attributeName].model || collection.attributes[attributeName].references){
                                                  attributeType = 'Link';
                                                  linkedClass = collection.attributes[attributeName].model || collection.attributes[attributeName].references;
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
                                                  attributeType = 'embeddedmap';
                                                else if (attributeType === 'text')
                                                  attributeType = 'string';
                                                  
                                                if(collection.attributes[attributeName].columnName)
                                                  columnName = collection.attributes[attributeName].columnName;
                                                
                                                if(attributeType){
                                                  klass.property.create({
                                                    name: columnName,
                                                    type: attributeType
                                                  });
                                                  if(linkedClass)
                                                    linksToBeCreated.push({
                                                      attributeName: columnName,
                                                      klass: klass,
                                                      linkedClass: linkedClass
                                                    });
                                                }
                                              }
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
    
                        var collection = _.find(me.collections, function (v, k) {
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
                  .error(function(err){ next(err); });
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
    
    
    /*Query methods starts from here*/

    dbHelper.prototype.query = function (collection, options, cb) {
      var _query;
    // Catch errors from building query and return to the callback
    try {
      _query = new Query(options, collection, this.config);
    } catch(err) {
      return cb(err);
    }

        var query = this.db.query(_query.criteria);

        query
            .all()
            .then(function (res) {
                cb(null, utils.rewriteIdsRecursive(res));
            })
            .error(function (err) {
                cb(err);
            });

    };
    
    dbHelper.prototype.getDB = function (cb) {
        var db = this.db;
       return cb(db);
    };
  
    
  /**
   * Retrieves records of class collection that fulfill the criteria in options
   */
  dbHelper.prototype.find = function(collection, options, cb) {
    var self = this;
    var collectionInstance = this.collections[collection];
    var schema = collectionInstance.waterline.schema;
    var attributes = collectionInstance.attributes;
    var _query, query;
    
    try {
      _query = new Query(options, schema, this.config);
    } catch(err) { return cb(err); }
    
    var edge;
    if (utils.isJunctionTableThrough(collectionInstance)) {
      edge = this.associations.getEdge(collection, options.where);
    }
    if (edge) {
      // Replace foreign keys with from and to
      _query.criteria.where.out = edge.from;
      _query.criteria.where.in = edge.to;
      edge.keys.forEach(function(refKey) { delete _query.criteria.where[refKey]; });
    }
    
    try {
      query = _query.getSelectQuery(collection);
    } catch(e) {
      log.error('Failed to compose find SQL query.', e);
      return cb(e);
    }
    
    log.debug('OrientDB query:', query.query[0]);
    
    var opts = { params: query.params || {} };
    if(options.fetchPlan){
      opts.fetchPlan = options.fetchPlan.where;
      log.debug('opts.fetchPlan:', opts.fetchPlan);
    }
    
    this.db
      .query(query.query[0], opts)
      .all()
      .then(function (res) {
        if (res && options.fetchPlan) {
          //log.debug('res', res);
          cb(null, utils.rewriteIdsRecursive(res, attributes));
        } else {
          cb(null, utils.rewriteIds(res, attributes));
        }
      })
      .error(function (e) {
        log.error('Failed to query the DB.', e);
        cb(e);
      });
  };


    //Deletes a collection from database
    dbHelper.prototype.drop = function (collection, relations, cb) {

    return this.db.class.drop(collection)
            .then(function (res) {
                cb(null, res);
            })
            .error(function (err) {
                cb(err);
            });
    };


    var createAssociations = function (collectionName, targetData, callback) {
        var me = this,
            collections = me.collections,
            collection = findCollectionByName(collections, collectionName);
        async.eachSeries(_.keys(collection.attributes), function (key, next) {
            var attr = collection.attributes[key];

            var srcAttr, srcCollection = attr.model && findCollectionByName(collections, attr.model);

            if (srcCollection)
                srcAttr = _.findWhere(srcCollection.attributes, {
                    via: attr.alias
                });

            if (srcAttr && srcAttr.edge) {
                me.createEdge(targetData[srcAttr.via], targetData['@rid'], {
                    '@class': srcAttr.edge
                }, function () {
                    next();
                });
            } else next();


        }, callback);
    };



  /**
   * Creates a new document from a collection
   */
  dbHelper.prototype.create = function(collection, options, cb) {
    var attributes, _document, collectionInstance,
        self = this;
    
    collectionInstance = this.collections[collection];
    attributes = collectionInstance.attributes;    
     
    _document = new Document(options, attributes);

    if(!_document.nestedAssociations)
      return self.dbCreate(collection, _document.values, cb);
      
    self.associations.createNestedAssociations(_document.nestedAssociations, function(err, results){
      if(err){
        cb(err);
        return;
      }
      _document.addForeignKeys(results);
      self.dbCreate(collection, _document.values, cb);
    });
  };
  
  
  /**
   * Calls Oriento to save a new document
   */
  dbHelper.prototype.dbCreate = function(collection, options, cb) {
    var collectionInstance = this.collections[collection];
    var attributes = collectionInstance.attributes;
    
    var edge;
    if (utils.isJunctionTableThrough(collectionInstance)){
      edge = this.associations.getEdge(collection, options);
    }
    
    var query;
    if (edge) {
      // Create edge
      options['@class'] = collection;
      edge.keys.forEach(function(refKey) {
        delete options[refKey];
      });
      query = this.db.edge.from(edge.from).to(edge.to).create(options);
    }
    else {
      query = this.db.insert()
        .into(collection)
        .set(options)
        .transform(transformers)
        .one();
    }
    
    query
      .then(function(res) {
        cb(null, utils.rewriteIds(res, attributes));
      })
      .error(function(err) {
        log.error('Failed to create object. DB error.', err);
        cb(err);
    });
  };
    

  /**
   * Updates a document from a collection
   */
  dbHelper.prototype.update = function(collection, options, values, cb) {
    var _query,
        _document,
        where,
        self = this;
    var collectionInstance = this.collections[collection];
    var schema = collectionInstance.waterline.schema;
    var attributes = collectionInstance.attributes;

    // Catch errors from building query and return to the callback
    try {
      _query = new Query(options, schema, self.config);
      _document = new Document(values, attributes);
      where = _query.getWhereQuery(collection);
    } catch(e) {
      log.error('Failed to compose update SQL query.', e);
      return cb(e);
    }

    var query = this.db.update(collection)
      .set(_document.values)
      .transform(transformers)
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
        cb(null, utils.rewriteIds(res, attributes));
      })
      .catch(function(err) {
        cb(err);
      });
  }; 


  /*
   * Deletes a document from a collection
   */
  dbHelper.prototype.destroy = function(collection, options, cb) {
    var _query, where, attributes;
    var collectionInstance = this.collections[collection];
    var attributes = collectionInstance.attributes;
    var schema = collectionInstance.waterline.schema;

    if (options.where && utils.isJunctionTableThrough(collectionInstance)) {
      var edge = this.associations.getEdge(collection, options.where);
      if (!edge.from || !edge.to)
        return cb(null, null);
      return this.deleteEdges(edge.from, edge.to, { '@class' : collection }, cb);
    }
    
    // Catch errors from building query and return to the callback
    try {
      _query = new Query(options, schema, this.config);
      where = _query.getWhereQuery(collection);
    } catch(e) {
      log.error('Failed to compose destroy SQL query.', e);
      return cb(e);
    }

    var query = this.db.delete()
      .from(collection)
      .transform(transformers)
      .return('BEFORE');

    if(where.query[0]){
      query.where(where.query[0]);
      if(where.params){
        query.addParams(where.params);
      }
    }

    query.all()
      .then(function(res) {
        cb(null, utils.rewriteIds(res, attributes));
      })
      .error(function(err) {
        cb(err);
      });
  };


  /*
   * Creates edge between two vertices pointed by from and to
   */
  dbHelper.prototype.createEdge = function(from, to, options, cb) {
    cb = cb || _.noop;

    this.db.edge.from(from).to(to).create(options)
      .then(function(res) {
        if (res.length === 1)
          res = res[0];
        cb(null, utils.rewriteIds(res));
      })
      .error(function(err) {
        cb(err);
      });
  }; 


  /*
   * Removes edges between two vertices pointed by from and to
   */
  dbHelper.prototype.deleteEdges = function(from, to, options, cb) {
    cb = cb || _.noop;
    
    if(!options)
      return this.db.edge.from(from).to(to).delete(options)
        .then(function(count) {
          cb(null, count);
        });
    
    // temporary workaround for issue: https://groups.google.com/forum/#!topic/orient-database/jlRFuFbdWNs
    var className = _.isString(options) ? options : options['@class'];
    var command = 'DELETE EDGE FROM ' + from + ' TO ' + to + " where @class = '" + className + "'";
    this.db.query(command)
      .then(function(count) {
          cb(null, count);
        });
  }; 

  
    var connect = function (connection, collections) {
        // if an active connection exists, use
        // it instead of tearing the previous
        // one down
        var d = Q.defer();

        try {

            getDb(connection, collections).then(function (db) {
                var helper = new dbHelper(db, collections, connection);

                helper.registerCollections()
                    .then(function (classes, err) {
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
        create: function (connection, collections) {
            return connect(connection, collections);
        }
    };

})();
