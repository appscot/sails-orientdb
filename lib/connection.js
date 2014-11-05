var Oriento = require('oriento'),
    Q = require('q'),
    async = require('async'),
    _ = require('underscore'),
    utils = require('./utils'),
    Query = require('./query'),
    Document = require('./document'),
    Associations = require('./associations');

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
            this.collectionsByIdentity = _.reduce(collections, function(accumulator, collection){
              accumulator[collection.identity] = collection;
              return accumulator;
            }, {});
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
	                                            	    attributeType = null,
	                                            	    columnName = attributeName;
	                                            	if(typeof collection.attributes[attributeName] === 'string')
	                                            		attributeType = collection.attributes[attributeName];
	                                            	else if (typeof collection.attributes[attributeName] === 'function')
	                                            		continue;
	                                            	else if (collection.attributes[attributeName].model){
	                                            		attributeType = 'Link';
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
	                                            		attributeType = 'embeddedmap';
	                                            		
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
    	if(this.collections[collection] && this.collections[collection].waterline.schema[collection])
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
            query = query.limit(options.limit);
            
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



  /**
   * Creates a new document from a collection
   */
  dbHelper.prototype.create = function(collection, options, cb) {
    var attributes, _document,
        self = this;

    if (this.collections[collection])
      attributes = this.collections[collection].attributes;
      
    _document = new Document(options, attributes);

    if(!_document.nestedAssociations)
      return this.dbCreate(collection, _document.values, cb);
      
    console.log(" ####################   Nested assotiations FINALLY, yay!!!!!   #####################");
      
    var associations = new Associations(this);
    associations.createNestedAssociations(_document.nestedAssociations, function(err, results){
      if(err){
        cb(err);
        return;
      }
      _document.addForeignKeys(results);
      console.log('create, _document.values: ' + require('util').inspect(_document.values));
      self.dbCreate(collection, _document.values, cb);
    });
  };
  
  /**
   * Calls Oriento to save a new document
   */
  dbHelper.prototype.dbCreate = function(collection, options, cb) {
    var attributes;
    if (this.collections[collection])
      attributes = this.collections[collection].attributes;
    
    var me = this;
    this.db.insert()
      .into(collection)
      .set(options)
      .transform(transformers)
      .one()
      .then(function(res) {
        cb(null, utils.rewriteIds(res, attributes));
      }).error(function(err) {
        console.log('create, err: ' + err);
        cb(err);
    });
  };
    

    /**
     * Updates a document from a collection
     */
    dbHelper.prototype.update = function (collection, options, values, cb) {
    	var _query, _document,
    	  self = this,
    	  attributes = this.collections[collection].attributes;
			
		// Catch errors from building query and return to the callback
		try {
		  _query = new Query(options, attributes);
		  _document = new Document(values, attributes);
		} catch(err) {
		  return cb(err);
		}

        var query = this.db
            .update(collection)
            .set(_document.values)
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
            	console.log('update, err: ' + require('util').inspect(err));
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
    	var self = this;
    	var _query, attributes;
    	if(this.collections[collection].waterline.schema[collection])
			attributes = this.collections[collection].waterline.schema[collection].attributes;
			
		// Catch errors from building query and return to the callback
		try {
		  _query = new Query(options, attributes);
		} catch(err) {
		  return cb(err);
		}
		
		if(_query.useGenericJoin)
		  return self.genericJoin(collection, options, cb, _query);
		
		var query = this.db;
		if(_query.criteria && _query.criteria.joins){
          _.forEach(_query.criteria.joins, function(fetchCriteria){
          	query = query.traverse(fetchCriteria.parentKey);
          });
		} else {
       	 query = query.select();
		}
		
		var from = this.db.select().from(collection);
        if (_query.criteria && _query.criteria.where){
          _.forEach(_query.criteria.where, function(subCriteria){
          	from = from.where(subCriteria);
          });
        }
        
        if (options.limit)
            from = from.limit(options.limit);
        
        query = query.from('(' + from.buildStatement() + ')');
        
        // optimistically copy params from 'from' to main 'query'
        var key;
        for(key in from._state.params){
          query._state.params[key] = from._state.params[key];
        }

        query.transform(transformers);
            
        query
            .all()
            .then(function (res) {
            	var cleanRes = utils.rewriteIds(res, attributes);
     			var results = self.processMultilevelResults(cleanRes, _query.criteria.joins);
     			console.log('join, results: ' + require('util').inspect(results));
                cb(null, results);
            })
            .error(function (err) {
                cb(err);
            });
    };
    


    /**
     * Generic Join
     * 
     * Low performance join that will populate models by performing myltiple queries
     */
    dbHelper.prototype.genericJoin = function (collection, options, cb, _query) {
    	var self = this;
    	
    	async.auto({
    		findParentModel: function(callback){
    			self.find(collection, options, callback);
    		},
    		
    		findChildModels: ['findParentModel', function(callback, results){
    			var parentIds = _.pluck(results.findParentModel, 'id');
    			
    			async.reduce(_query.criteria.joins, [], function(accumulator, join, next){
    				var options = {};
    				options.where = {};
    				options.where[join.childKey] = parentIds;
    				self.find(join.child, options, function(err, models){
    					if (_.isArray(models))
    						accumulator.push.apply(accumulator, models);
    					else
    						accumulator.push(models);
    					next(err, accumulator);
    				});
    			}, 
    			function(err, results){
    				callback(err, results);
    			});
    			
    		}],
    		
    		concatAndProcessResults: ['findChildModels', function(callback, results){
    			try{
    				var allRecords = results.findParentModel.concat(results.findChildModels);
    				var newResults = self.processMultilevelResults(allRecords, _query.criteria.joins);
    				callback(null, newResults);
    			} catch(err){
    				callback(err);
    			}
    		}]
    	}, 
    		function(err, results){
    			console.log('genericJoin, results.concatAndProcessResults: ' + require('util').inspect(results.concatAndProcessResults));
    			cb(err, results.concatAndProcessResults);
    	});
    	
    	
    };


	/**
	 * Process multi level results and merges them according to join criteria
	 */
	dbHelper.prototype.processMultilevelResults = function (results, joins){
		
	   	// create a map between RID and record
		var rowMap = _.reduce(results, function(accumulator, record){
			var recordId = record['id'];
			accumulator[recordId] = {
				record: record,
				parent: true
				};
			return accumulator;
		}, {});
		
		// process records for each join
		_.forEach(joins, function(fetchCriteria){
			var parentTable = fetchCriteria.parent;
			var childTable = fetchCriteria.child;
			var parentKey = fetchCriteria.parentKey;
			var alias = fetchCriteria.alias;
			var parentIsInbound = (parentKey == 'id');
			var childKey = fetchCriteria.childKey;
			
			// go through every record and replace foreign key by linked record
			_.forEach(results, function(record){
				if(record['@class'] === childTable){
					//child
					rowMap[record['id']].parent = false;
					if(!parentIsInbound)
						return;
				} else if (record['@class'] === parentTable) {
					//parent
					if(parentIsInbound)
						return;
					if(!record[parentKey]){
						console.log(' >> JOIN, parentKey: ' + parentKey + ' not found! record: ' + require('util').inspect(record));
						return;
					}
				} else {
					//this record is not relevant for this join
					rowMap[record['id']].parent = false;
					return;
				}
				
				if(!parentIsInbound){
					var new_value;
					if(record[parentKey] instanceof Array){
						new_value = [];
						_.forEach(record[parentKey], function(foreignKey){
							new_value.push(rowMap[foreignKey].record);
						});
					} else {
						new_value = rowMap[record[parentKey]].record;
					}
				
					if(alias){
						record[alias] = new_value;
						if(fetchCriteria.removeParentKey){
							delete record[parentKey];
						}
					} else {
						record[parentKey] = new_value;
					}
				} else {
					var newKey = alias || childTable;
					var parentRecord = rowMap[record[childKey]].record;
					parentRecord[newKey] = (parentRecord[newKey] || []);
					parentRecord[newKey].push(record);
				}
			});
		});
		
		return _.filter(results, function(record){
			return rowMap[record['id']].parent;
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
