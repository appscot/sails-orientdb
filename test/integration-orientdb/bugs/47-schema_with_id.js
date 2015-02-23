var assert = require('assert'),
    _ = require('lodash'),
    utils = require('../../../lib/utils');

var self = this;

describe('Bug #47: Schema with id (blueprints like)', function() {
  before(function (done) {
  
    var fixtures = {
      UserFixture : {
        identity : 'user',
  
        attributes : {
          username : {
            type : 'string'
          },
          email : {
            type : 'email'
          },
        }
      },
      PassportFixture : {
        identity : 'passport',
  
        attributes : {
          id : {
            type : 'string',
            primaryKey : true,
            columnName : '@rid'
          },
  
          password : {
            type : 'string'
          }
        }
      }
    }; 

    CREATE_TEST_WATERLINE(self, 'test_bug_47', fixtures, function(err, val){
      console.log('ERROR: ', err);
      done();
    });
  });
  after(function (done) {
    DELETE_TEST_WATERLINE('test_bug_47', done);
  });

  describe('create user', function() {
  
    /////////////////////////////////////////////////////
    // TEST METHODS
    ////////////////////////////////////////////////////
      
    it('should be robust against an insertion with id set', function(done) {
      // we probably should throw an error...
      self.collections.User.create({ email: 'email@example.com', id: '#13:1' }, function(err, user) {
        if(err) { return done(err); }
        assert.equal(user.email, 'email@example.com');
        done();
        
      });
    });
    
    it('should be robust against an insertion with a null id', function(done) {
      self.collections.Passport.create({ password: 'blah', id: null }, function(err, passport) {
        if(err) { return done(err); }
        assert.equal(passport.password, 'blah');
        done();
      });
    });
    
    it('should be robust against an insertion with id set', function(done) {
      // we probably should throw an error...
      self.collections.Passport.create({ password: 'blah', id: '#13:1' }, function(err, passport) {
        if(err) { return done(err); }
        assert.equal(passport.password, 'blah');
        done();
      });
    });
      

  });
});
