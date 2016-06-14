var assert = require('assert'),
    _ = require('lodash');

var self = this,
    fixtures,
    config;

describe('Config tests', function() {
  before(function (done) {
  
    fixtures = {
      UserFixture : {
        identity : 'user',
        attributes : {
          name : 'string'
        }
      },
      ThingFixture : {
        identity : 'thing',
  
        attributes : {
          name : 'string'
        }
      }
    };
    
    config = {
      user : 'root',
      password : 'hello',
      database: 'test_config_options_db'
    };

    CREATE_TEST_WATERLINE(self, config, fixtures, done);
  });
  after(function (done) {
    DELETE_TEST_WATERLINE(config, done);
  });

  describe('options', function() {
  
    describe('pool', function() {

    /////////////////////////////////////////////////////
    // TEST SETUP
    ////////////////////////////////////////////////////
      
      before(function (done) {
        // db created, let's close the connection so we can test logins
        self.waterline.teardown(done);
      });
      
      after(function (done) {
        // let's log off last user because it may not have privileges to drop the db later on
        self.waterline.teardown(function (err) {
          if (err) {  return done(err); }
          // and now we logon with original config
          CREATE_TEST_WATERLINE(self, config, fixtures, done);
        });
      });
      
      /////////////////////////////////////////////////////
      // TEST METHODS
      ////////////////////////////////////////////////////
      
      it('should be undefined', function (done) {
        CREATE_TEST_WATERLINE(self, config, fixtures, function (err) {
          if (err) {  return done(err); }
          var server = self.collections.User.getServer();
          assert.equal(server.transport.pool, undefined);
          done();
        });
      });
      
      it('should have max equal 10', function (done) {
        self.waterline.teardown(function (err) {
          if (err) {  return done(err); }

          var newConfig = _.cloneDeep(config);

          newConfig.options = {
            pool: { max: 10 }
          };

          CREATE_TEST_WATERLINE(self, newConfig, fixtures, function (err) {
            if (err) {  return done(err); }
            var server = self.collections.User.getServer();
            assert.equal(server.transport.pool.max, 10);
            done();
          });
        });
      });
      
    });
  });
});
