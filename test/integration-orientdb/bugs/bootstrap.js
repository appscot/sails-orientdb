/**
 * Module Dependencies
 */
var Waterline = require('waterline');
var _ = require('lodash');
var async = require('async');
var Adapter = require('../../../');

var config = require('../../test-connection.json');
config.database = 'waterline-test-orientdb';
config.options = config.options || {};
config.options.storage = "memory";

var fixtures = {
  Profile40Fixture: require('./40-object_instead_id/40.profile.fixture'),
  SubprofileFixture: require('./40-object_instead_id/40.subprofile.fixture'),
  ProfileconnectionFixture: require('./40-object_instead_id/40.profileconnection.fixture')
};


/////////////////////////////////////////////////////
// TEST SETUP
////////////////////////////////////////////////////

var waterline, ontology;

before(function(done) {
  
  //globals
  global.Bugs = {};

  waterline = new Waterline();

  Object.keys(fixtures).forEach(function(key) {
    waterline.loadCollection(fixtures[key]);
  });

  var Connections = {
    'test': config
  };
  Connections.test.adapter = 'wl_tests';
  
  var connections = { bugs: _.clone(Connections.test) };

  waterline.initialize({ adapters: { wl_tests: Adapter }, connections: connections }, function(err, _ontology) {
    if(err) return done(err);

    ontology = _ontology;

    Object.keys(_ontology.collections).forEach(function(key) {
      var globalName = key.charAt(0).toUpperCase() + key.slice(1);
      global.Bugs[globalName] = _ontology.collections[key];
    });

    done();
  });
});

after(function(done) {

  function dropCollection(item, next) {
    if(!Adapter.hasOwnProperty('drop')) return next();

    ontology.collections[item].drop(function(err) {
      if(err) return next(err);
      next();
    });
  }

  async.each(Object.keys(ontology.collections), dropCollection, function(err) {
    if(err) return done(err);
    
    ontology.collections[Object.keys(ontology.collections)[0]].getServer(function(server){
      server.drop({
        name: config.database,
        storage: config.options.storage
      })
      .then(function(err){
        waterline.teardown(done);
      });
    });
  });

});
