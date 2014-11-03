/**
 * Module Dependencies
 */
var orient = require('./connection');

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
module.exports = (function () {

    // You'll want to maintain a reference to each connection
    // that gets registered with this adapter.
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
    var getConn = function (config, collections) {
        return orient.create(config, collections);
    };

    var adapter = {

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
        
        // Which type of primary key is used by default
    	pkFormat: 'string',

        syncable: false,

        // Default configuration for connections
        defaults: {
            host: 'localhost',
            database: 'waterline',
            port: 2424,
            username: 'root',
            password: 'root'
        },

        getConnection: getConn,

        /**
         *
         * This method runs when a model is initially registered at
         * server-start-time. This is the only required method.
         *
         * @param {[type]}
         *            connection [description]
         * @param {[type]}
         *            collection [description]
         * @param {Function}
         *            cb [description]
         * @return {[type]} [description]
         */
        registerConnection: function (connection, collections, cb) {

            if (!connection.identity)
                return cb(new Error('Connection is missing an identity.'));
            if (connections[connection.identity])
                return cb(new Error('Connection is already registered.'));
            // Add in logic here to initialize connection
            // e.g. connections[connection.identity] = new Database(connection,
            // collections);

            getConn(connection, collections).then(function (helper) {
                connections[connection.identity] = helper;
                cb();
            });
        },

        /**
         * Fired when a model is unregistered, typically when the server is
         * killed. Useful for tearing-down remaining open connections, etc.
         *
         * @param {Function}
         *            cb [description]
         * @return {[type]} [description]
         */
        // Teardown a Connection
        teardown: function (conn, cb) {

            if (typeof conn == 'function') {
                cb = conn;
                conn = null;
            }
            if (!conn) {
                connections = {};
                return cb();
            }
            if (!connections[conn])
                return cb();
            delete connections[conn];
            cb();
        },

        // Return attributes
        describe: function (connection, collection, cb) {
            // Add in logic here to describe a collection (e.g. DESCRIBE TABLE
            // logic)

            connections[connection].collection.getProperties(collection,
                function (res, err) {
                    cb(err, res);
                });

        },

        /**
         *
         * REQUIRED method if integrating with a schemaful (SQL-ish) database.
         *
         */
        define: function (connection, collection, definition, cb) {
            // Add in logic here to create a collection (e.g. CREATE TABLE
            // logic)
            return connections[connection].create(collection, {
                waitForSync: true
            }).then(function (res) {
                cb(null, res);
            }, function (err) {
                cb(err);
            });
        },

        /**
         *
         * REQUIRED method if integrating with a schemaful (SQL-ish) database.
         *
         */
        drop: function (connection, collection, relations, cb) {
            // Add in logic here to delete a collection (e.g. DROP TABLE logic)

            return connections[connection].drop(collection, relations, cb);

        },

        /**
         *
         * REQUIRED method if users expect to call Model.find(),
         * Model.findOne(), or related.
         *
         * You should implement this method to respond with an array of
         * instances. Waterline core will take care of supporting all the other
         * different find methods/usages.
         *
         */
        find: function (connection, collection, options, cb) {
            return connections[connection].find(collection, options, cb);
        },

        query: function (connection, collection, options, cb) {
            return connections[connection].query(collection, options, cb);
        },

        create: function (connection, collection, values, cb) {
            return connections[connection].create(collection, values, cb);
        },

        update: function (connection, collection, options, values, cb) {
            return connections[connection].update(collection, options, values, cb);
        },

        destroy: function (connection, collection, options,  cb) {
            return connections[connection].destroy(collection, options, cb);
        },
        
        /**
         * Get DB
         * Returns the native OrientDB Object
         */
        getDB: function (connection, collection, cb) {
            return connections[connection].getDB(cb);
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
	    join: function (connection, collection, options, cb) {
	    	console.log('join, connection: ' + require('util').inspect(connection));
	    	console.log('join, collection: ' + require('util').inspect(collection));
	    	console.log('join, options: ' + require('util').inspect(options));
	    	console.log('join, options.joins[0].select: ' + require('util').inspect(options.joins[0].select));
	    	console.log('join, options.joins[0].criteria: ' + require('util').inspect(options.joins[0].criteria));
	    	return connections[connection].join(collection, options, cb);
	    },
        

        /*
         * // Custom methods defined here will be available on all models // which
         * are hooked up to this adapter: // // e.g.: // foo: function
         * (collectionName, options, cb) { return cb(null,"ok"); }, bar: function
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
         *
         *
         *
         *
         */
        /*
         * Creates edge between two vertices pointed by from and to
         */
        createEdge: function (connection, collection, from, to, options, cb) {
            connections[connection].createEdge(from, to, options, cb);
        },

        /*
         * Removes edges between two vertices pointed by from and to
         */
        deleteEdges: function (connection, collection, from, to, options, cb) {
            this.db.edge.from(from).to(to).delete(options)
                .then(function (count) {
                    console.log('deleted ' + count + ' edges');
                });


        }


    };

    // Expose adapter definition
    return adapter;

})();
