var assert = require('assert'),
    _ = require('lodash'),
    utils = require('../../../lib/utils');

var self = this;

describe('Bug #44: Unrecognized Types', function() {
  before(function (done) {

    var fixtures = {
      UserFixture : {
        // Enforce model schema in the case of schemaless databases
        schema : true,
        identity : 'user',

        attributes : {
          id : {
            type : 'string',
            primaryKey : true,
            columnName : '@rid'
          },
          username : {
            type : 'string',
            unique : true
          },
          email : {
            type : 'email',
            unique : true
          },
          // comment as we don't have a fixture for Passport
          // passports : {
            // collection : 'Passport',
            // via : 'user'
          // }
        }
      }
    }; 

    CREATE_TEST_WATERLINE(self, 'test_bug_44', fixtures, done);
  });
  after(function (done) {
    DELETE_TEST_WATERLINE('test_bug_44', done);
  });

  describe('create user', function() {
    /////////////////////////////////////////////////////
    // TEST SETUP
    ////////////////////////////////////////////////////
  
    /////////////////////////////////////////////////////
    // TEST METHODS
    ////////////////////////////////////////////////////
      
    it('should create a user with e-mail', function(done) {
      self.collections.User.create({ email: 'email@example.com' }, function(err, user) {
        if(err) { return done(err); }
        assert.equal(user.email, 'email@example.com');
        done();
      });
    });
      

  });
});
