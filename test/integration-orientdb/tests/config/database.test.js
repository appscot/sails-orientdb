var assert = require('assert'),
    _ = require('lodash');

var self = this,
    fixtures,
    config,
    configConn = require('../../../test-connection.json');

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
      user : configConn.user,
      password : configConn.password,
      database : 'test_config_db'
    };

    CREATE_TEST_WATERLINE(self, config, fixtures, done);
  });
  after(function (done) {
    DELETE_TEST_WATERLINE(config, done);
  });

  describe('database', function() {
  
    describe('username', function() {

    /////////////////////////////////////////////////////
    // TEST SETUP
    ////////////////////////////////////////////////////
      
      before(function (done) {
        // db created, let's close the connection so we can test logins
        self.waterline.teardown(done);
      });
      
      after(function (done) {
        // let's log off last user because it may not have privileges to drop the db later on
        self.waterline.teardown(function(err){
          if(err) { return done(err); }
          // and now we logon with original config
          CREATE_TEST_WATERLINE(self, config, fixtures, done);
        });
      });
      
      /////////////////////////////////////////////////////
      // TEST METHODS
      ////////////////////////////////////////////////////
      it('should be the same as connection username', function(done) {
        CREATE_TEST_WATERLINE(self, config, fixtures, function(err){
          if(err) { return done(err); }
          self.collections.User.getDB(function(db){
            assert.equal(db.username, config.user);
            done();
          });
        });
      });
      
      it('should be the same as databaseUser', function(done) {
        self.waterline.teardown(function(err){
          if(err) { return done(err); }
          
          var newConfig = _.cloneDeep(config);
          
          newConfig.options = {
            databaseUser : 'admin',
            databasePassword : 'admin',
          };
        
          CREATE_TEST_WATERLINE(self, newConfig, fixtures, function(err){
            if(err) { return done(err); }
            self.collections.User.getDB(function(db){
              assert.equal(db.username, 'admin');
              done();
            });
          });
        });
      });

      it('should be able to connect with database credentials only', function(done) {
        self.waterline.teardown(function (err) {
          if (err) { return done(err); }
          
          var newConfig = _.cloneDeep(configConn);
          newConfig.user = undefined;
          newConfig.password = undefined;
          newConfig.options.databaseUser = newConfig.databaseTestUser || 'admin';
          newConfig.options.databasePassword = newConfig.databaseTestPassword || 'admin';
          
          CREATE_TEST_WATERLINE(self, newConfig, fixtures, function(err){
            if (err) { return done(err); }
            
            done();
          });
        });
      })      
    });
  });
});
