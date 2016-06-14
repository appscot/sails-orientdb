var assert = require('assert'),
    _ = require('lodash');

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

var baseConfig = {
  database : 'test_performance_drop',
  options : {
    unsafeDrop : false
  }
}

describe('Performance', function() {
  
  function elapsedTime (startPoint){
    var diff = process.hrtime(startPoint);
    return (diff[0] * 1e9 + diff[1]) / 1e6; // divide by a million to get nano to milli
  }
  
  function initializeDB(context, config, cb) {
    CREATE_TEST_WATERLINE(context, config, _.cloneDeep(fixtures), function(err){
      if(err) { return cb(err); }
      
      context.collections.User.create({ username: 'user1' }, function(err, user) {
        if(err) { return cb(err); }
        
        context.collections.Passport.create({ user: user.id, password: 'abcd5678' }, function(err, passport) {
          if(err) { return cb(err); }
          cb();
        });
        
      });
    });
  }

  describe('drop', function() {
    
    var safeDuration, unsafeDuration;
    
    describe('safely', function() {
    
      /////////////////////////////////////////////////////
      // TEST SETUP
      ////////////////////////////////////////////////////
      
      before(function (done) {
        initializeDB(self, baseConfig, done);
      });
      
    
      /////////////////////////////////////////////////////
      // TEST METHODS
      ////////////////////////////////////////////////////
      
      it('should drop all fixtures in timely manner', function(done) {
        this.timeout(2000);
        var start = process.hrtime();
        DELETE_TEST_WATERLINE(baseConfig, function(err){
          if(err) return done(err);

          safeDuration = elapsedTime(start);
          console.log('performance_drop:', safeDuration, 'ms');
          done();
        });
      });
    });
    
    describe('unsafely', function() {
    
      /////////////////////////////////////////////////////
      // TEST SETUP
      ////////////////////////////////////////////////////
      
      var unsafeConfig = {
        database : 'test_performance_drop_unsafe',
        options : {
          unsafeDrop : true
        }
      }
      
      var unsafeContex = {};
      
      before(function (done) {
        initializeDB(unsafeContex, unsafeConfig, function(err){
          if (err) {
            console.log(err); 
            return done(err);
          }
          done();
        });
      });
      
    
      /////////////////////////////////////////////////////
      // TEST METHODS
      ////////////////////////////////////////////////////
      
      it('should drop all fixtures in timely manner', function(done) {
        this.timeout(2000);
        var start = process.hrtime();
        DELETE_TEST_WATERLINE(unsafeConfig, function(err){
          if(err) return done(err);

          unsafeDuration = elapsedTime(start);
          console.log('performance_drop_unsafe:', unsafeDuration, 'ms');
          done();
        });
      });
      
      it('unsafe should be faster than safe', function(done) {
        assert(unsafeDuration < safeDuration);
        done();
      });
    
    });
    
  });
});
