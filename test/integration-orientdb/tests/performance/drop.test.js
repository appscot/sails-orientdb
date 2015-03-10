var assert = require('assert');

var self = this;
    
// Require Fixtures
var localFixturesPath = '../../fixtures/';

var fixtures = {
  TeamFixture: require('./fixtures/hasManyThrough.team.fixture.js'),
  StadiumFixture: require(localFixturesPath + 'hasManyThrough.stadium.fixture'),
  VenueFixture: require(localFixturesPath + 'hasManyThrough.venueHack.fixture'),
  FriendFixture: require(localFixturesPath + 'hasManyThrough.friend.fixture'),
  FollowsFixture: require(localFixturesPath + 'hasManyThrough.follows.fixture'),
  OwnsFixture: require(localFixturesPath + 'hasManyThrough.owns.fixture'),
  IndexesFixture: require(localFixturesPath + 'define.indexes.fixture'),
  PropertiesFixture: require(localFixturesPath + 'define.properties.fixture'),
  SchemalessPropertiesFixture: require(localFixturesPath + 'define.schemalessProperties.fixture'),
  DriverFixture: require(localFixturesPath + 'manyToMany.driverHack.fixture'),
  TaxiFixture: require('./fixtures/manyToMany.taxi.fixture'),
  UserFixture : {
    identity : 'user',
    attributes : {
      username : {
        type : 'string',
        unique : true
      },
      passports : {
        collection : 'Passport',
        via : 'user',
        dominant : true
      }
    }
  },
  PassportFixture : {
    identity : 'passport',
    attributes : {
      password : {
        type : 'string',
        minLength : 8
      },
      user : {
        collection : 'User',
        via : 'passports'
      },
    }
  }
};

describe('Performance', function() {
  
  // after(function (done) {
    // DELETE_TEST_WATERLINE('test_performance_drop', done);
  // });

  describe('drop', function() {
    
    /////////////////////////////////////////////////////
    // TEST SETUP
    ////////////////////////////////////////////////////
    
    var driverRecord;
  
    before(function (done) {
      CREATE_TEST_WATERLINE(self, 'test_performance_drop', fixtures, function(err){
        if(err) { return done(err); }
        
        self.collections.User.create({ username: 'user1' }, function(err, user) {
          if(err) { return done(err); }
          
          self.collections.Passport.create({ user: user.id, password: 'abcd5678' }, function(err, passport) {
            if(err) { return done(err); }
            done();
          
          });
        });
      });
    });
    
  
    /////////////////////////////////////////////////////
    // TEST METHODS
    ////////////////////////////////////////////////////
    
    it('should drop all fixtures in timely manner', function(done) {
      this.timeout(2000);
      console.time('performance_drop');
      DELETE_TEST_WATERLINE('test_performance_drop', function(err){
        if(err) { done(err); }
        console.timeEnd('performance_drop');
        done();
      });
    });

  });
});
