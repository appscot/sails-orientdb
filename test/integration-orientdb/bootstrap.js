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


// Require Fixtures
var fixturesPath = '../../node_modules/waterline-adapter-tests/interfaces/associations/support/fixtures/';

var fixtures = {
  PaymentBelongsFixture: require(fixturesPath + 'belongsTo.child.fixture'),
  CustomerBelongsFixture: require(fixturesPath + 'belongsTo.parent.fixture'),
  PaymentHasManyFixture: require(fixturesPath + 'hasMany.child.fixture'),
  CustomerHasManyFixture: require(fixturesPath + 'hasMany.parent.fixture'),
  ApartmentHasManyFixture: require(fixturesPath + 'hasMany.customPK.fixture'),
  PaymentManyFixture: require(fixturesPath + 'multipleAssociations.fixture').payment,
  CustomerManyFixture: require(fixturesPath + 'multipleAssociations.fixture').customer,
  // StadiumFixture: require(fixturesPath + 'hasManyThrough.stadium.fixture'),
  StadiumFixture: require('./fixtures/hasManyThrough.stadium.fixture'),
  TeamFixture: require(fixturesPath + 'hasManyThrough.team.fixture'),
  //VenueFixture: require(fixturesPath + 'hasManyThrough.venue.fixture'),
  VenueFixture: require('./fixtures/hasManyThrough.venueHack.fixture'),
  TaxiFixture: require(fixturesPath + 'manyToMany.taxi.fixture'),
  //DriverFixture: require(fixturesPath + 'manyToMany.driver.fixture'),
  DriverFixture: require('./fixtures/manyToMany.driverHack.fixture.js'),
  UserOneFixture: require(fixturesPath + 'oneToOne.fixture').user_resource,
  ProfileOneFixture: require(fixturesPath + 'oneToOne.fixture').profile,
  
  FriendFixture: require('./fixtures/hasManyThrough.friend.fixture'),
  FollowsFixture: require('./fixtures/hasManyThrough.follows.fixture'),
  OwnsFixture: require('./fixtures/hasManyThrough.owns.fixture'),
  
  IndexesFixture: require('./fixtures/define.indexes.fixture'),
  PropertiesFixture: require('./fixtures/define.properties.fixture')
};


/////////////////////////////////////////////////////
// TEST SETUP
////////////////////////////////////////////////////

var waterline, ontology;

before(function(done) {
  
  //globals
  global.Associations = {};

  waterline = new Waterline();

  Object.keys(fixtures).forEach(function(key) {
    waterline.loadCollection(fixtures[key]);
  });

  var Connections = {
    'test': config
  };
  Connections.test.adapter = 'wl_tests';
  
  var connections = { associations: _.clone(Connections.test) };

  waterline.initialize({ adapters: { wl_tests: Adapter }, connections: connections }, function(err, _ontology) {
    if(err) return done(err);

    ontology = _ontology;

    Object.keys(_ontology.collections).forEach(function(key) {
      var globalName = key.charAt(0).toUpperCase() + key.slice(1);
      global.Associations[globalName] = _ontology.collections[key];
    });

    done();
  });
});

after(function(done) {

  function dropCollection(item, next) {
    if(!Adapter.hasOwnProperty('drop')) return next();
    
    // TODO: this is causing OrientDB.ConnectionError [2]: write EPIPE
    // ontology.collections[item].drop(function(err) {
      // if(err) return next(err);
      next();
// });
  }

  async.each(Object.keys(ontology.collections), dropCollection, function(err) {
    if(err) {
      console.log('ERROR:', err);
      done(err);
    }
    
    ontology.collections[Object.keys(ontology.collections)[0]].getServer(function(server){
      server.drop({
        name: config.database,
        storage: config.options.storage
      })
      .then(function(err){
        waterline.teardown(done);
      })
      .catch(done);
    });
  });

});
