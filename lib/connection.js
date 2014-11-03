var Oriento = require('oriento'),
    Q = require('q'),
    async = require('async'),
    _ = require('underscore'),
    utils = require('./utils'),
    Query = require('./query');

module.exports = (function () {

    'use strict';

    var defaults = {
            createCustomIndex: false,
            idProperty: 'id'
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
            this.config = _.extend({}, defaults, config);
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


    var registerEdges = function (classes, collection, callback) {
        var db = this.db;
        async.eachSeries(_.keys(collection.attributes), function (key, nextAttr) {
                var attr = collection.attributes[key];
                if (attr.edge) {
                    var edgeFound = _.findWhere(classes, {
                        name: attr.edge
                    });
                    if (edgeFound) nextAttr();
                    else {
                        db.class
                            .create(attr.edge, 'E')
                            .then(function (edgeClass, err) {
                                nextAttr();
                            });
                    }
                } else nextAttr();
            },
            callback);
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

                                    db.class
                                        .create(tableName, 'V')
                                        .then(function (klass, err) {
                                            // registerEdges.call(me, classes, collection, function () {
                                                // next(err, klass);
                                            // });
                                            //TODO: refactor: move this to own method!!!
                                            // Create OrientDB schema
                                            if (collection.attributes){
                                            	var attributeName;
	                                            for(attributeName in collection.attributes){
	                                            	var linkedClass = null,
	                                            	    attributeType = null;
	                                            	if(typeof collection.attributes[attributeName] === 'string')
	                                            		attributeType = collection.attributes[attributeName];
	                                            	else if (typeof collection.attributes[attributeName] === 'function')
	                                            		continue;
	                                            	else if (collection.attributes[attributeName].model){
	                                            		attributeType = 'link';
	                                            		linkedClass = collection.attributes[attributeName].model;
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
	                                            		attributeType = undefined;
	                                            	
	                                            	if(attributeType){
		                                            	klass.property.create({
		                                            		name: attributeName,
		                                            		type: attributeType
		                                            	});
		                                            	if(linkedClass)
		                                            		linksToBeCreated.push({
		                                            			attributeName: attributeName,
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
		  _query = new Query(options, collection);
		} catch(err) {
		  return cb(err);
		}

        var query = this.db.query(_query.criteria);

        query
            .all()
            .then(function (res) {
                cb(null, utils.rewriteIds(res));
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
     * 
     */
    dbHelper.prototype.find = function (collection, options, cb) {
    	var _query, attributes;
    	if(this.collections[collection].waterline.schema[collection])
			attributes = this.collections[collection].waterline.schema[collection].attributes;
			
		// Catch errors from building query and return to the callback
		try {
		  _query = new Query(options, attributes);
		} catch(err) {
		  return cb(err);
		}
		
        var query = this.db.select().from(collection);

        if (_query.criteria && _query.criteria.where){
          _.forEach(_query.criteria.where, function(subCriteria){
          	query = query.where(subCriteria);
          });
        }

        query.transform(transformers);

        if (options.limit)
            query = query
            .limit(options.limit);
        query
            .all()
            .then(function (res) {
                cb(null, utils.rewriteIds(res, attributes));
            })
            .error(function (err) {
                cb(err);
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


    /*
    Creates a new document from a collection
    */
    dbHelper.prototype.create = function (collection, options, cb) {
    	var attributes;
    	
        // convert rid string to record object
        for (var option in options){
            if(typeof options[option] == "string"){
                if(options[option].indexOf("#") == 0 && options[option].split(":").length == 2){
                    options[option] = new Oriento.RID(options[option]);
                }
            }
        }
        
        //TODO: if we are creating an edge we shouldn't save the foreign key
        if(this.collections[collection].waterline.schema[collection])
			attributes = this.collections[collection].waterline.schema[collection].attributes;

        var me = this;
        this.db.insert()
            .into(collection)
            .set(options)
            .transform(transformers)
            .one()
            .then(function (res) {
                cb(null, utils.rewriteIds(res, attributes));
            }).error(function (err) {
                cb(err);
            });

    };

    /*
    Updates a document from a collection
    */
    dbHelper.prototype.update = function (collection, options, values, cb) {
    	var _query, attributes;
		// Catch errors from building query and return to the callback
		try {
		  _query = new Query(options, collection);
		} catch(err) {
		  return cb(err);
		}
		
		if(this.collections[collection].waterline.schema[collection])
			attributes = this.collections[collection].waterline.schema[collection].attributes;

        var query = this.db
            .update(collection)
            .set(values)
            .transform(transformers)
            .return('AFTER');
            
        if (_query.criteria && _query.criteria.where){
          _.forEach(_query.criteria.where, function(subCriteria){
          	query = query.where(subCriteria);
          });
        }

        query.all()
            .then(function (res) {
                cb(null, utils.rewriteIds(res, attributes));
            }).error(function (err) {
                cb(err);
            });
    };

    /*
    Deletes a document from a collection
    */
    dbHelper.prototype.destroy = function (collection, options, cb) {
    	var _query, attributes;
		// Catch errors from building query and return to the callback
		try {
		  _query = new Query(options, collection);
		} catch(err) {
		  return cb(err);
		}
		
		if(this.collections[collection].waterline.schema[collection])
			attributes = this.collections[collection].waterline.schema[collection].attributes;

        var query = this.db.delete()
            .from(collection)
            .transform(transformers)
            .return('BEFORE');
            
       if (_query.criteria && _query.criteria.where){
          _.forEach(_query.criteria.where, function(subCriteria){
          	query = query.where(subCriteria);
          });
        }

        query.all()
            .then(function (res) {
                cb(null, utils.rewriteIds(res, attributes));
            })
            .error(function (err) {
                cb(err);
            });

    };
    
    
    /**
     * Join
     */
    dbHelper.prototype.join = function (collection, options, cb) {
    	var _query, attributes;
    	if(this.collections[collection].waterline.schema[collection])
			attributes = this.collections[collection].waterline.schema[collection].attributes;
			
		// Catch errors from building query and return to the callback
		try {
		  _query = new Query(options, attributes);
		} catch(err) {
		  return cb(err);
		}
		
        var query = this.db.select('@this.toJSON(\'fetchPlan:*:1\')').from(collection);
        //var query = this.db.select().from(collection);

        if (_query.criteria && _query.criteria.where){
          _.forEach(_query.criteria.where, function(subCriteria){
          	query = query.where(subCriteria);
          });
        }

        query.transform(transformers);
        
        // if(_query.criteria && _query.criteria.joins){
          // _.forEach(_query.criteria.joins, function(fecthCriteria){
          	// var fetchPlan = {};
          	// fetchPlan[fecthCriteria.parentKey] = 1;
          	// console.log('fetchPlan: ' + require('util').inspect(fetchPlan));
            // query = query.fetch(fetchPlan);
          // });
        // }

        if (options.limit)
            query = query.limit(options.limit);
            
        query
            .all()
            .then(function (res) {
            	var leanRes = res;
            	var cleanRes = res.map(function(value){
            		if (!value.this)
             		  return value;
             		var newValue = JSON.parse(value.this);
             		newValue['@rid'] = value['@rid'];
             		return newValue;
            	});
            	
            	_.forEach(cleanRes, function(record){
          	      _.forEach(_query.criteria.joins, function(join){
          	      	if(join.alias){
          	      	  record[join.alias] = record[join.parentKey];
          	      	  delete record[join.parentKey];
          	      	}
          	      });
                });
            	console.log('cleanRes: ' + require('util').inspect(cleanRes));
                cb(null, utils.rewriteIds(cleanRes, attributes));
            })
            .error(function (err) {
                cb(err);
            });

    };
    

    /*
     * Creates edge between two vertices pointed by from and to
     */
    dbHelper.prototype.createEdge = function (from, to, options, cb) {
        this.db.edge.from(from).to(to).create(options)
            .then(function (res) {
                cb(null, utils.rewriteIds(res));
            })
            .error(function (err) {
                cb(err);
            });
    };

    /*
     * Removes edges between two vertices pointed by from and to
     */
    dbHelper.prototype.deleteEdges = function (from, to, options, cb) {
        this.db.edge.from(from).to(to).delete(options)
            .then(function (count) {
                console.log('deleted ' + count + ' edges');
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
            console.log('An error has occured when trying to connect to OrientDB:');
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
