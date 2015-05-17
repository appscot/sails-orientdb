/**
 * Module Dependencies
 */
var Waterline = require('waterline');
var _ = require('lodash');
var async = require('async');
var Adapter = require('../../');

var config = require('../test-connection.json');
config.database = 'waterline-test-orientdb';
config.options = config.options || {};
config.options.storage = "memory";

var instancesMap = {};

/////////////////////////////////////////////////////
// TEST SETUP
////////////////////////////////////////////////////

global.CREATE_TEST_WATERLINE = function(context, testConfig, fixtures, cb){
  cb = cb || _.noop;
  
  var waterline, ontology;
  
  var localConfig = _.cloneDeep(config);
  if(testConfig){
    if(_.isString(testConfig)){
      localConfig.database = testConfig;
    } else if(_.isObject(testConfig)){
      _.merge(localConfig, testConfig);
    }
  }
  
  waterline = new Waterline();
  
  // context variable
  context.collections = {};
  context.waterline = waterline;
  
  Object.keys(fixtures).forEach(function(key) {
    fixtures[key].connection = localConfig.database;
    waterline.loadCollection(Waterline.Collection.extend(fixtures[key]));
  });
  
  var Connections = {
    'test': localConfig
  };
  Connections.test.adapter = 'wl_tests';
  
  var connections = {};
  connections[localConfig.database] = _.clone(Connections.test);
  
  waterline.initialize({ adapters: { wl_tests: Adapter }, connections: connections }, function(err, _ontology) {
    if(err) return cb(err);
  
    ontology = _ontology;
  
    Object.keys(_ontology.collections).forEach(function(key) {
      var globalName = key.charAt(0).toUpperCase() + key.slice(1);
      context.collections[globalName] = _ontology.collections[key];
    });
    
    instancesMap[localConfig.database] = {
      waterline: waterline,
      ontology: ontology,
      config: localConfig
    };
    
    cb(null, context.collections);
  });
};


global.DELETE_TEST_WATERLINE = function(testConfig, cb){
  cb = cb || _.noop;
  
  var dbName = _.isString(testConfig) ? testConfig : testConfig.database;
  
  if(!instancesMap[dbName]) { return cb(new Error('Waterline instance not found for ' + dbName + '! Did you use the correct db name?')); };
  
  var ontology = instancesMap[dbName].ontology;
  var waterline = instancesMap[dbName].waterline;
  var localConfig = instancesMap[dbName].config;

  function dropCollection(item, next) {
    if(!Adapter.hasOwnProperty('drop')) return next();

    ontology.collections[item].drop(function(err) {
      if(err) return next(err);
      next();
    });
  }

  async.each(Object.keys(ontology.collections), dropCollection, function(err) {
    if(err) {
      console.log('ERROR dropping collections:', err);
      return cb(err);
    };
    
    Adapter.getServer(localConfig.database, undefined, function(server){
      server.drop({
        name: localConfig.database,
        storage: localConfig.options.storage
      })
      .then(function(){
        waterline.teardown(cb);
      })
      .catch(cb);
    });
  });

};
