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

    CREATE_TEST_WATERLINE(self, 'test_bug_47', fixtures, done);
  });
  after(function (done) {
    DELETE_TEST_WATERLINE('test_bug_47', done);
  });

  describe('create user', function() {
  
    /////////////////////////////////////////////////////
    // TEST METHODS
    ////////////////////////////////////////////////////
    var userRecord, passportRecord, passportNullIdRecord;
    
    before(function (done) {
      self.collections.User.create({ email: 'user1@example.com' }, function(err, user) {
        if(err) { return done(err); }
        userRecord = user;
        
        self.collections.Passport.create({ password: 'passport1' }, function(err, passport) {
          if(err) { return done(err); }
          passportRecord = passport;
          
          self.collections.Passport.create({ password: 'passport2', id: null }, function(err, passport2) {
            if(err) { return done(err); }
            passportNullIdRecord = passport2;
            done();
          });
          
        });
      });
    });
    
    
    it('should be robust against an insertion with id set', function(done) {
      // we probably should throw an error...
      self.collections.User.create({ email: 'email@example.com', id: '#13:1' }, function(err, user) {
        if(err) { return done(err); }
        assert.equal(user.email, 'email@example.com');
        done();
        
      });
    });
    
    it('regression test: should retrieve user by id', function(done) {
      self.collections.User.findOne(userRecord.id, function(err, user) {
        if(err) { return done(err); }
        assert.equal(user.email, 'user1@example.com');
        done();
      });
    });
    
    it('should be robust against an insertion with a null id', function(done) {
      self.collections.Passport.create({ password: 'blah', id: null }, function foundUser(err, passport) {
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
    
    it('regression test: should retrieve passport by id', function(done) {
      self.collections.Passport.findOne(passportRecord.id, function foundPassport(err, passport) {
        if(err) { return done(err); }
        assert.equal(passport.password, 'passport1');
        done();
      });
    });
    
    it('regression test: should retrieve passport by id even if submitted with id `null`', function(done) {
      self.collections.Passport.findOne(passportNullIdRecord.id, function foundPassport(err, passport2) {
        if(err) { return done(err); }
        assert.equal(passport2.password, 'passport2');
        done();
      });
    });
      

  });
});
