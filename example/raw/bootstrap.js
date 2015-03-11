/**
 * Based on https://github.com/balderdashy/waterline/blob/master/example/raw/bootstrap.js
 */

/**
 * Module dependencies
 */

var Waterline = require('waterline'),
    orientAdapter = require('../../lib/adapter');


/**
 * Set up Waterline with the specified
 * models, connections, and adapters.

  @param options
    :: {Object}   adapters     [i.e. a dictionary]
    :: {Object}   connections  [i.e. a dictionary]
    :: {Object}   collections  [i.e. a dictionary]

  @param  {Function} cb
    () {Error} err
    () ontology
      :: {Object} collections
      :: {Object} connections

  @return {Waterline}
 */

module.exports = function bootstrap( options, cb ) {

  var adapters = options.adapters || { 'default': orientAdapter, 'waterline-orientdb': orientAdapter };
  var connections = options.connections || {};
  var collections = options.collections || {};



  for(var key in adapters) {
    // Make sure our adapter defs have `identity` properties
    adapters[key].identity = adapters[key].identity || key;
  }
  
  
  var extendedCollections = [];
  for(var key in collections) {
    
    // Make sure our collection defs have `identity` properties
    collections[key].identity = collections[key].identity || key;
    
    // Fold object of collection definitions into an array
    // of extended Waterline collections.
    extendedCollections.push(Waterline.Collection.extend(collections[key]));
  }


  // Instantiate Waterline and load the already-extended
  // Waterline collections.
  var waterline = new Waterline();
  extendedCollections.forEach(function (collection) {
    waterline.loadCollection(collection);
  });


  // Initialize Waterline
  // (and tell it about our adapters)
  waterline.initialize({
    adapters: adapters,
    connections: connections
  }, cb);

  return waterline;
};
