var assert = require('assert'),
    _ = require('lodash');

var self = this;

describe('decodeURIComponent: decode the id', function() {
  
  var fixtures = {
    UserFixture : {
      identity : 'user',
  
      attributes : {
        username : 'string',
        email : 'email',
      }
    },
    BlueprintsUserFixture : {
      identity : 'blue_user',
  
      attributes : {
        id : {
          type : 'string',
          primaryKey : true,
          columnName : '@rid'
        },
        username : 'string',
        email : 'email',
      }
    }
  };
  
  var config = {
    database: 'test_decodeURIComponent',
    options: {
      decodeURIComponent: true
    }
  }
  
  before(function (done) {
    CREATE_TEST_WATERLINE(self, config, fixtures, done);
  });
  after(function (done) {
    DELETE_TEST_WATERLINE(config, done);
  });

  describe('find user', function() {
  
    /////////////////////////////////////////////////////
    // TEST METHODS
    ////////////////////////////////////////////////////
    var userRecord, encodedUserId, encodedUser2Id, blueUserRecord, encodedBlueUserId;
    
    before(function (done) {
      self.collections.User.create([{ email: 'user1@example.com' }, { email: 'user2@example.com' }], function(err, users) {
        if(err) { return done(err); }
        userRecord = users[0];
        encodedUserId = encodeURIComponent(userRecord.id);
        encodedUser2Id = encodeURIComponent(users[1].id);
        self.collections.Blue_user.create({ email: 'blue@example.com' }, function(err, blueUser) {
          if(err) { return done(err); }
          blueUserRecord = blueUser;
          encodedBlueUserId = encodeURIComponent(blueUserRecord.id);
          done();
        });
      });
    });
    
    
    it('regression test: should retrieve user by id', function(done) {
      self.collections.User.findOne(userRecord.id, function(err, user) {
        if(err) { return done(err); }
        assert.equal(user.email, 'user1@example.com');
        done();
      });
    });
    
    it('should retrieve user with encoded id', function(done) {
      self.collections.User.findOne(encodedUserId, function(err, user) {
        if(err) { return done(err); }
        assert.equal(user.email, 'user1@example.com');
        done();
      });
    });
    
    it('should retrieve 2 users with encoded id', function(done) {
      self.collections.User.find([encodedUserId, encodedUser2Id], function(err, users) {
        if(err) { return done(err); }
        assert.equal(users[0].email, 'user1@example.com');
        assert.equal(users[1].email, 'user2@example.com');
        done();
      });
    });
    
    it('regression test: should retrieve blueprints user by id', function(done) {
      self.collections.Blue_user.findOne(blueUserRecord.id, function(err, user) {
        if(err) { return done(err); }
        assert.equal(user.email, 'blue@example.com');
        done();
      });
    });
    
    it('should retrieve blueprints user with encoded id', function(done) {
      self.collections.Blue_user.findOne(encodedBlueUserId, function(err, user) {
        if(err) { return done(err); }
        assert.equal(user.email, 'blue@example.com');
        done();
      });
    });
      

  });
});
