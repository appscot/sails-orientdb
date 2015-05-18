var assert = require('assert'),
    _ = require('lodash');

describe.only('Adapter Custom Methods', function() {

  describe('query', function() {
    
    /////////////////////////////////////////////////////
    // TEST SETUP
    ////////////////////////////////////////////////////
    
    var user;
    
    before(function(done) {
      Associations.Friend.create({ name: 'friend query' }, function(err, createdUser) {
        if(err) return done(err);
        
        user = createdUser;
        done();
      });
    });
    
    after(function(done) {
      Associations.Friend.destroy(user.id, done);
    });
    
    
    describe('query user', function() {
      
      /////////////////////////////////////////////////////
      // TEST METHODS
      ////////////////////////////////////////////////////
      
      it('should return user', function(done) {
        Associations.Friend.query("SELECT FROM friendTable WHERE name='friend query'", function(err, retrievedUsers){
          if (err) { done(err); }
          assert.equal(retrievedUsers.length, 1);
          assert.equal(retrievedUsers[0].id, user.id);
          assert(!retrievedUsers[0]['@rid']);
          done();
        });       
      });
      
      it('should return user using parameterized query', function(done) {
        Associations.Friend.query("SELECT FROM friendTable WHERE name=:name", {
          params: {
            name: 'friend query'
          }
        }, function(err, retrievedUsers){
          if (err) { done(err); }
          assert.equal(retrievedUsers.length, 1);
          assert.equal(retrievedUsers[0].id, user.id);
          assert(!retrievedUsers[0]['@rid']);
          done();
        });       
      });
      
      it('should return user in a promise', function(done) {
        Associations.Friend.query("SELECT FROM friendTable WHERE name='friend query'")
        .then(function(retrievedUsers){
          assert.equal(retrievedUsers.length, 1);
          assert.equal(retrievedUsers[0].id, user.id);
          assert(!retrievedUsers[0]['@rid']);
          done();
        })
        .catch(done);       
      });
      
      it('should return user in a promise using parameterized query', function(done) {
        Associations.Friend.query("SELECT FROM friendTable WHERE name=:name", {
          params: {
            name: 'friend query'
          }
        })
        .then(function(retrievedUsers){
          assert.equal(retrievedUsers.length, 1);
          assert.equal(retrievedUsers[0].id, user.id);
          assert(!retrievedUsers[0]['@rid']);
          done();
        })
        .catch(done);       
      });
      
    });
    
  });
  
  
});