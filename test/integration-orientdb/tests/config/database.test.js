var assert = require('assert'),
    _ = require('lodash');

var self = this,
    fixtures,
    config;

describe('Config tests)', function() {
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
      password : 'root',
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
        // db created, let's close the connection
        self.waterline.teardown(done);
      });
      
      /////////////////////////////////////////////////////
      // TEST METHODS
      ////////////////////////////////////////////////////
      
      it('should be the same as connection username', function(done) {
        CREATE_TEST_WATERLINE(self, config, fixtures, function(err){
          if(err) { return done(err); }
          self.collections.User.getDB(function(db){
            assert.equal(db.username, 'root');
            done();
          });
        });
      });
      
      it('should be the same as databaseUsername', function(done) {
        self.waterline.teardown(function(err){
          if(err) { return done(err); }
          
          config.options = {
            databaseUser : 'admin',
            databasePassword : 'admin',
          };
        
          CREATE_TEST_WATERLINE(self, config, fixtures, function(err){
            if(err) { return done(err); }
            self.collections.User.getDB(function(db){
              assert.equal(db.username, 'admin');
              done();
            });
          });
        });
      });
      
    });
  });
});
