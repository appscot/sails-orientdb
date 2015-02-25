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
        // id : {
          // type : 'string',
          // primaryKey : true,
          // columnName : '@rid'
        // },
        username : {
          type : 'string',
          unique : true
        },
        email : {
          type : 'email',
          unique : true
        },
        passports : {
          collection : 'Passport',
          via : 'user'
        }
      }
    },
    PassportFixture : {
      identity : 'passport',

      attributes : {
        // id : {
          // type : 'string',
          // primaryKey : true,
          // columnName : '@rid'
        // },
        protocol : {
          type : 'alphanumeric',
          required : true
        },

        password : {
          type : 'string',
          minLength : 8
        },
        provider : {
          type : 'alphanumericdashed'
        },
        identifier : {
          type : 'string'
        },
        tokens : {
          type : 'json'
        },

        user : {
          model : 'User',
          required : true
        },

        validatePassword : function(password, next) {
          next(null, password);
        }
      },

      beforeCreate : function(passport, next) {
        next(null, passport);
      },

      beforeUpdate : function(passport, next) {
        next(null, passport);
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
        
        self.collections.Passport.create({ user: user.id, password: 'abcd5678', protocol: '80' }, function(err, passport) {
        if(err) { return done(err); }
        assert.equal(passport.password, 'abcd5678');
        done();
        
        });
      });
    });
      

  });
});
