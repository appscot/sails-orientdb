"use strict";
/**
 * Module Dependencies
 */

var ensureNewline = process.env.NODE_ENV !== 'production';
var log = require('debug-logger').config({ ensureNewline: ensureNewline })('sails-orientdb:adapter'),
    Connection = require('./connection'),
    utils = require('./utils');
    
/**
 * sails-orientdb
 *
 * Most of the methods below are optional.
 *
 * If you don't need / can't get to every method, just implement what you have
 * time for. The other methods will only fail if you try to call them!
 *
 * For many adapters, this file is all you need. For very complex adapters, you
 * may need more flexiblity. In any case, it's probably a good idea to start
 * with one file and refactor only if necessary. If you do go that route, it's
 * conventional in Node to create a `./lib` directory for your private
 * submodules and load them at the top of the file with other dependencies. e.g.
 * var update = `require('./lib/update')`;
 */
module.exports = (function() {

  // You'll want to maintain a reference to each connection
  // that gets registered with this adapter.
  //
  // Keep track of all the connections used by the app
  var connections = {};

  // You may also want to store additional, private data
  // per-connection (esp. if your data store uses persistent
  // connections).
  //
  // Keep in mind that models can be configured to use different databases
  // within the same app, at the same time.
  //
  // i.e. if you're writing a MariaDB adapter, you should be aware that one
  // model might be configured as `host="localhost"` and another might be
  // using
  // `host="foo.com"` at the same time. Same thing goes for user, database,
  // password, or any other config.
  //
  // You don't have to support this feature right off the bat in your
  // adapter, but it ought to get done eventually.
  //
  // Sounds annoying to deal with...
  // ...but it's not bad.  In each method, acquire a connection using the config
  // for the current model (looking it up from `_modelReferences`), establish
  // a connection, then tear it down before calling your method's callback.
  // Finally, as an optimization, you might use a db pool for each distinct
  // connection configuration, partioning pools for each separate configuration
  // for your adapter (i.e. worst case scenario is a pool for each model, best case
  // scenario is one single single pool.)  For many databases, any change to 
  // host OR database OR user OR password = separate pool.
  // var _dbPools = {};
  
  var adapter = {
    identity: 'sails-orientdb',

    // Set to true if this adapter supports (or requires) things like data
    // types, validations, keys, etc.
    // If true, the schema for models using this adapter will be
    // automatically synced when the server starts.
    // Not terribly relevant if your data store is not SQL/schemaful.
    //
    // If setting syncable, you should consider the migrate option,
    // which allows you to set how the sync will be performed.
    // It can be overridden globally in an app (config/adapters.js)
    // and on a per-model basis.
    //
    // IMPORTANT:
    // `migrate` is not a production data migration solution!
    // In production, always use `migrate: safe`
    //
    // drop => Drop schema and data, then recreate it
    // alter => Drop/add columns as necessary.
    // safe => Don't change anything (good for production DBs)
    //
    syncable : true,

    // Which type of primary key is used by default
    pkFormat : 'string',

    // Default configuration for connections
    defaults : {
      
      // Connection Configuration
      database : 'waterline',
      host : 'localhost',
      port : 2424,
      schema : true,
      
      // Additional options
      options: {

        // DB/Oriento Options
        //
        // database type: graph | document
        databaseType : 'graph',
        //
        // storage type: memory | plocal
        storage : 'plocal',
        //
        // transport: binary | rest. Currently only binary is supported: https://github.com/codemix/oriento/issues/44
        transport : 'binary',
        //
        // connection pool: by default oriento uses one socket per server, but it is also possible to use a connection 
        // pool by adding a pool object that will be sent to Oriento, e.g.: { max: 10 }
        pool: null,
        //
        // Sets the oriento logger for error, log and debug. e.g.: { debug: console.log.bind(console) }
        orientoLogger : {},

        // Enable JTW Token in orientjs. http://orientdb.com/docs/2.1/Network-Binary-Protocol.html#token
        useToken : false,
        //
        // database username, by default uses connection username set on config
        // databaseUser : null,
        //
        // database password, by default uses connection password set on config
        // databasePassword : null,
        
        // Useful in REST APIs
        //
        // If `id` is URI encoded, decode it with `decodeURIComponent()` (useful when `id` comes from an URL)
        decodeURIComponent : true,
        //
        // Replaces circular references with `id` after populate operations (useful when results will be JSONfied)
        removeCircularReferences : false,
        
        // migrations
        //
        // Drop tables without deleting edges/vertexes hence not ensuring graph consistency
        // Will speed up drop operations. Only works with migration: 'alter' or 'drop'
        unsafeDrop : false,
        
        // other
        //
        // Turn parameterized queries on
        parameterized : true,
        //
        // Waterline only allows populating 1 level below. fetchPlanLevel allows to
        // to populate further levels below (experimental)
        fetchPlanLevel : 1
      }
    },


    /**
     *
     * This method runs when a model is initially registered at
     * server-start-time. This is the only required method.
     *
     * @param {[type]} connection [description]
     * @param {[type]} collection [description]
     * @param {Function} cb [description]
     * @return {[type]} [description]
     */
    registerConnection : function(connection, collections, cb) {
      log.debug('registerConnection: db=' + connection.database, ', connection=' + connection.identity);

      if (!connection.identity)
        return cb(new Error('Connection is missing an identity.'));
      if (connections[connection.identity])
        return cb(new Error('Connection is already registered.'));
      // Add in logic here to initialize connection
      // e.g. connections[connection.identity] = new Database(connection,
      // collections);
      
      connections[connection.identity] = new Connection(connection, collections, cb);
    },


    /**
     * Teardown a Connection
     * 
     * Fired when a model is unregistered, typically when the server is
     * killed. Useful for tearing-down remaining open connections, etc.
     *
     * @param {Function} cb [description]
     * @return {[type]} [description]
     */
    teardown : function(conn, cb) {
      log.debug('teardown:', conn);
      /* istanbul ignore if: standard waterline-adapter code */
      if ( typeof conn == 'function') {
        cb = conn;
        conn = null;
      }
      /* istanbul ignore if: standard waterline-adapter code */
      if (!conn) {
        connections = {};
        return cb();
      }
      /* istanbul ignore if: standard waterline-adapter code */
      if (!connections[conn])
        return cb();
      delete connections[conn];
      cb();
    },


    /**
     * Describe
     *
     * Return the Schema of a collection after first creating the collection
     * and indexes if they don't exist.
     *
     * @param {String} connection
     * @param {String} collection
     * @param {Function} callback
     */
    describe : function(connection, collection, cb) {
      log.debug('describe:', collection);
      // Add in logic here to describe a collection (e.g. DESCRIBE TABLE
      // logic)
      connections[connection].describe(collection, cb);
    },
    
    
    /**
     * Define
     *
     * Create a new Orient Collection and set Index Values
     * Add in logic here to create a collection (e.g. CREATE TABLE 
     * logic)
     *
     * @param {String} connection
     * @param {String} collection
     * @param {Object} definition
     * @param {Function} cb
     */
    define : function(connection, collection, definition, cb) {
      log.debug('define:', collection);

      // Create the collection and indexes
      connections[connection].createCollection(collection, definition, cb);
    },


    /**
     * Drop
     *
     * Drop a Collection
     *
     * @param {String} connectionName
     * @param {String} collectionName
     * @param {Array} relations
     * @param {Function} callback
     */
    drop : function(connection, collection, relations, cb) {
      log.debug('drop:', collection);
      // Add in logic here to delete a collection (e.g. DROP TABLE logic)

      return connections[connection].drop(collection, relations, cb);
    },


    /**
     * AddAttribute
     *
     * Add a property to a class
     *
     * @param {String} connection
     * @param {String} collection
     * @param {String} attrName
     * @param {Object} attrDef
     * @param {Function} cb
     */
    addAttribute: function(connection, collection, attrName, attrDef, cb) {
      log.debug('addAttribute: ' + collection + ', attrName:', attrName);
      
      return connections[connection].addAttribute(collection, attrName, attrDef, cb);
    },
    
    
    /**
     * Find
     *
     * Find all matching documents in a colletion.
     * 
     * REQUIRED method if users expect to call Model.find(),
     * Model.findOne(), or related.
     *
     * You should implement this method to respond with an array of
     * instances. Waterline core will take care of supporting all the other
     * different find methods/usages.
     *
     */
    find : function(connection, collection, options, cb) {
      return connections[connection].find(collection, options, function(err, res){
        if (err) { return cb(err); }
        res.forEach(function(record){ utils.cleanOrientAttributes(record /*, TODO: add schema */); });
        cb(null, res);
      });
    },

    create : function(connection, collection, values, cb) {
      return connections[connection].create(collection, values, cb);
    },

    update : function(connection, collection, options, values, cb) {
      // TODO: On "1:1 update nested associations() when association have primary keys should update association values"
      // test `values` includes an extraneous field `inspect`, this is a
      // temporary workaround until we figure where `inspect` is coming from
      if(values.inspect && typeof values.inspect === 'function') { delete values.inspect; }
      
      return connections[connection].update(collection, options, values, function(err, res){
        if (err) { return cb(err); }
        res.forEach(function(record){ utils.cleanOrientAttributes(record /*, TODO: add schema */); });
        cb(null, res);
      });
    },

    destroy : function(connection, collection, options, cb) {
      return connections[connection].destroy(collection, options, cb);
    },


    /**
     * Join
     *
     * Peforms a join between 2-3 orientdb collections when Waterline core
     * needs to satisfy a `.populate()`.
     *
     * @param  {[type]}   connection  [description]
     * @param  {[type]}   collection  [description]
     * @param  {[type]}   options     [description]
     * @param  {Function} cb          [description]
     * @return {[type]}               [description]
     */
    join : function(connection, collection, options, cb) {
      return connections[connection].join(collection, options, cb);
    },


    /*
     * Custom methods
     * 
     * Custom methods defined here will be available on all models which
     * are hooked up to this adapter
     * 
     * e.g.: foo: function (collectionName, options, cb) { 
     *   return cb(null,"ok"); }, bar: function
     * (collectionName, options, cb) { if (!options.jello) return
     * cb("Failure!"); else return cb(); destroy: function (connection,
     * collection, options, values, cb) { return cb(); } // So if you have three
     * models: // Tiger, Sparrow, and User // 2 of which (Tiger and Sparrow)
     * implement this custom adapter, // then you'll be able to access: // //
     * Tiger.foo(...) // Tiger.bar(...) // Sparrow.foo(...) // Sparrow.bar(...) //
     * Example success usage: // // (notice how the first argument goes away:)
     * Tiger.foo({}, function (err, result) { if (err) return
     * console.error(err); else console.log(result); // outputs: ok }); //
     * Example error usage: // // (notice how the first argument goes away:)
     * Sparrow.bar({test: 'yes'}, function (err, result){ if (err)
     * console.error(err); else console.log(result); // outputs: Failure! })
     */
    
    /**
     * Create Edge
     * 
     * Creates edge between two vertices pointed by from and to
     * 
     * @param {Object} connection
     * @param {Object} collection
     * @param {Object} from
     * @param {Object} to
     * @param {Object} options
     * @param {Object} cb
     */
    createEdge : function(connection, collection, from, to, options, cb) {
      return connections[connection].createEdge(from, to, options, cb);
    },


    /**
     * Delete Edges
     * 
     * Removes edges between two vertices pointed by from and to
     * 
     * @param {Object} connection
     * @param {Object} collection
     * @param {Object} from
     * @param {Object} to
     * @param {Object} options
     * @param {Object} cb
     */
    deleteEdges : function(connection, collection, from, to, options, cb) {
      return connections[connection].deleteEdges(from, to, options, cb);
    },
    
    /**
     * Query
     * 
     * Runs a SQL query against the database using Oriento's query method
     * Will attempt to convert @rid's into ids.
     * 
     * @param {Object} connection
     * @param {Object} collection
     * @param {String} query
     * @param {String} options
     * @param {Object} cb
     */
    query : function(connection, collection, query, options, cb) {
      return connections[connection].query(query, options, cb);
    },
    
    /**
     * Native
     *
     * Give access to a native orientd collection object for running custom
     * queries.
     *
     * @param {String} connection
     * @param {String} collection
     * @param {Function} callback
     */
    native: function(connection, collection, cb) {
      return connections[connection].native(collection, cb);
    },
    
    /**
     * Get DB
     * 
     * Returns the native OrientDB Object
     * 
     * @param {Object} connection
     * @param {Object} collection
     * @param {Object} cb
     */
    getDB : function(connection, collection, cb) {
      return connections[connection].getDB(cb);
    },
    
    /**
     * Get Server
     * 
     * Returns the native Oriento connection object
     * 
     * @param {Object} connection
     * @param {Object} collection
     * @param {Object} cb
     */
    getServer : function(connection, collection, cb) {
      return connections[connection].getServer(cb);
    },
    
    /**
     * Remove Circular References
     * 
     * Replaces circular references with `id` when one is available, otherwise it replaces the object
     * with string '[Circular]'
     * 
     * @param {Object} connection
     * @param {Object} collection
     * @param {Object} object
     * @param {Object} cb
     */
    removeCircularReferences : function(connection, collection, object, cb) {
      utils.removeCircularReferences(object);
      if (cb) {
        cb(object);
      }
      return object;
    },
    
    /**
     * Run Function
     * 
     * Run an OrientDB server side function
     * 
     * @param {Object} connection
     * @param {Object} collection
     * @param {String} functionName - the name of the server function
     * @param {...Object} object - will be passed to server function
     */
    runFunction : function(connection, collection, functionName) {
      var args = Array.prototype.slice.call(arguments, 3);
      return connections[connection].runFunction(functionName, args);
    },
    
    /**
     * Increment
     * 
     * Increments a field by a given amount
     * 
     * @param {Object} connection
     * @param {Object} collection
     * @param {Object} criteria
     * @param {String} field
     * @param {Number} amount
     * @param {Function} cb
     */
    increment : function(connection, collection, criteria, field, amount, cb) {
      return connections[connection].increment(collection, criteria, field, amount, cb);
    }
  };

  // Expose adapter definition
  return adapter;

})();
