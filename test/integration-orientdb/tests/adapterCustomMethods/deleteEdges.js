var assert = require('assert'),
    _ = require('lodash');

describe('Adapter Custom Methods', function() {

  describe('deleteEdges', function() {
    
    /////////////////////////////////////////////////////
    // TEST SETUP
    ////////////////////////////////////////////////////
    
    var user, profile;
    
    before(function(done) {
      Associations.User_resource.create({ name: 'the edge delete' }, function(err, createdUser) {
        if(err) return done(err);
        
        user = createdUser;
        
        Associations.Profile.create({ name: 'edge profile delete' }, function(err, createdProfile) {
          if(err) return done(err);
          
          profile = createdProfile;
          
          Associations.User_resource.createEdge(user.id, profile.id, null, function(err, edge){
            if(err) return done(err);
            
            assert(edge);
            
            Associations.User_resource.createEdge(user.id, profile.id, { '@class': 'followsTable' }, function(err, edge){
              if(err) return done(err);
              
              assert(edge);
              
              done();
            });
          });
          
        });
      });
    });
    
    
    describe('between two vertices', function() {
      
      /////////////////////////////////////////////////////
      // TEST METHODS
      ////////////////////////////////////////////////////
      
      it('should delete an edge of class followsTable', function(done) {
        Associations.User_resource.deleteEdges(user.id, profile.id, { '@class': 'followsTable' }, function(err, count){
          if(err) return done(err);
          
          Associations.User_resource.getDB(function(db){
            db
              .query('select expand(outE()) from ' + user.id)
              .then(function(resultSet){
                assert(_.isArray(resultSet), 'is array');
                assert.equal(resultSet.length, 1);
                assert.notEqual(resultSet[0]['@class'], 'followsTable');
                done();
              })
              .catch(done);
          });
        });
      });
      
      
      it('should delete an edge between a user and profile', function(done) {
        Associations.User_resource.deleteEdges(user.id, profile.id, null, function(err, count){
          if(err) return done(err);
          
          Associations.User_resource.getDB(function(db){
            db
              .query('select expand(out()) from ' + user.id)
              .then(function(resultSet){
                assert(_.isArray(resultSet), 'is array');
                assert.equal(resultSet.length, 0);
                done();
              })
              .catch(done);
          });
        });
      });
      
    });
    
  });
});