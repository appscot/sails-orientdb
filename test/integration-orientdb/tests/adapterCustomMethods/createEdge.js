var assert = require('assert'),
    _ = require('lodash');

describe('Adapter Custom Methods', function() {

  describe('createEdge', function() {
    
    /////////////////////////////////////////////////////
    // TEST SETUP
    ////////////////////////////////////////////////////
    
    var user, profile;
    
    before(function(done) {
      Associations.User_resource.create({ name: 'the edge create' }, function(err, createdUser) {
        if(err) return done(err);
        
        user = createdUser;
        
        Associations.Profile.create({ name: 'edge profile create' }, function(err, createdProfile) {
          if(err) return done(err);
          
          profile = createdProfile;
          
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
          if(err) return done(err);
          
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
              .catch(function(err) { done(err); } );
          });
        });
      });
      
    });
    
  });
});