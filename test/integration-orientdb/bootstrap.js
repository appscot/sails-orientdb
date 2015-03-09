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
var originalFixturesPath = '../../node_modules/waterline-adapter-tests/interfaces/associations/support/fixtures/';

var fixtures = {
  PaymentBelongsFixture: require(originalFixturesPath + 'belongsTo.child.fixture'),
  CustomerBelongsFixture: require(originalFixturesPath + 'belongsTo.parent.fixture'),
  PaymentHasManyFixture: require(originalFixturesPath + 'hasMany.child.fixture'),
  CustomerHasManyFixture: require(originalFixturesPath + 'hasMany.parent.fixture'),
  ApartmentHasManyFixture: require(originalFixturesPath + 'hasMany.customPK.fixture'),
  PaymentManyFixture: require(originalFixturesPath + 'multipleAssociations.fixture').payment,
  CustomerManyFixture: require(originalFixturesPath + 'multipleAssociations.fixture').customer,
  // StadiumFixture: require(originalFixturesPath + 'hasManyThrough.stadium.fixture'),
  StadiumFixture: require('./fixtures/hasManyThrough.stadium.fixture'),
  TeamFixture: require(originalFixturesPath + 'hasManyThrough.team.fixture'),
  //VenueFixture: require(originalFixturesPath + 'hasManyThrough.venue.fixture'),
  VenueFixture: require('./fixtures/hasManyThrough.venueHack.fixture'),
  TaxiFixture: require(originalFixturesPath + 'manyToMany.taxi.fixture'),
  //DriverFixture: require(originalFixturesPath + 'manyToMany.driver.fixture'),
  DriverFixture: require('./fixtures/manyToMany.driverHack.fixture.js'),
  UserOneFixture: require(originalFixturesPath + 'oneToOne.fixture').user_resource,
  ProfileOneFixture: require(originalFixturesPath + 'oneToOne.fixture').profile,
  
  FriendFixture: require('./fixtures/hasManyThrough.friend.fixture'),
  FollowsFixture: require('./fixtures/hasManyThrough.follows.fixture'),
  OwnsFixture: require('./fixtures/hasManyThrough.owns.fixture'),
  
  IndexesFixture: require('./fixtures/define.indexes.fixture'),
  PropertiesFixture: require('./fixtures/define.properties.fixture'),
  SchemalessPropertiesFixture: require('./fixtures/define.schemalessProperties.fixture'),
};


/////////////////////////////////////////////////////
// TEST SETUP
////////////////////////////////////////////////////

var waterline, ontology;

before(function(done) {
  this.timeout(60000);  // to prevent travis from breaking the build
  
  //globals
  global.Associations = {};

  waterline = new Waterline();

  Object.keys(fixtures).forEach(function(key) {
    var fixture = fixtures[key];
    if(typeof fixture !== 'function'){
      // fixture definition has not been extended to collection yet
      fixture = Waterline.Collection.extend(fixture);
    }
    waterline.loadCollection(fixture);
  });

  var Connections = {
    'test': config
  };
  Connections.test.adapter = 'wl_tests';
  
  var connections = { associations: _.clone(Connections.test) };

  waterline.initialize({ adapters: { wl_tests: Adapter }, connections: connections }, function(err, _ontology) {
    if(err) {
      console.log('ERROR:', err);
      done(err);
    }

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
