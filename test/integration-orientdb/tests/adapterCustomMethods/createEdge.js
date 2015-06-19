var assert = require('assert'),
    _ = require('lodash');

describe('Adapter Custom Methods', function() {

  describe('createEdge', function() {
    
    /////////////////////////////////////////////////////
    // TEST SETUP
    ////////////////////////////////////////////////////
    
    var user, user2, profile, profile2;
    
    before(function(done) {
      Associations.User_resource.create([{ name: 'user_create_1' }, { name: 'user_create_2' }], function(err, createdUsers) {
        if(err) return done(err);
        
        user = createdUsers[0];
        user2 = createdUsers[1];
        
        Associations.Profile.create([{ name: 'profile_create_1' }, { name: 'profile_create_2' }], function(err, createdProfiles) {
          if(err) return done(err);
          
          profile = createdProfiles[0];
          profile2 = createdProfiles[1];
          
          done();
        });
      });
    });
    
    
    describe('between two vertices', function() {
      
      /////////////////////////////////////////////////////
      // TEST METHODS
      ////////////////////////////////////////////////////
      
      
      it('should link a user to a profile through an edge', function(done) {
        Associations.User_resource.createEdge(user.id, profile.id, null, function(err, edge){
          
          assert(!!edge);
          assert.equal(edge.out, user.id);
          assert.equal(edge.in, profile.id);
          
          Associations.User_resource.getDB(function(db){
            db
              .query('select expand(out()) from ' + user.id)
              .then(function(resultSet){
                assert(_.isArray(resultSet), 'is array');
                assert.equal(resultSet[0]['@rid'].toString(), profile.id);
                done();
              })
              .catch(done);
          });
        });
      });
      
      it('should link a user to a profile through an edge using promise', function(done) {
        Associations.User_resource.createEdge(user2.id, profile2.id, null)
        .then(function(edge){
          assert(!!edge);
          assert.equal(edge.out, user2.id);
          assert.equal(edge.in, profile2.id);
          
          Associations.User_resource.getDB(function(db){
            db
              .query('select expand(out()) from ' + user2.id)
              .then(function(resultSet){
                assert(_.isArray(resultSet), 'is array');
                assert.equal(resultSet[0]['@rid'].toString(), profile2.id);
                done();
              })
              .catch(done);
          });
        })
        .catch(done);
      });
      
    });
    
  });
});