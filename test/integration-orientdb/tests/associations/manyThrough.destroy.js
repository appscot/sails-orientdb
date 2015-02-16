var assert = require('assert'),
    _ = require('lodash');

describe('Association Interface', function() {

  describe('n:m through association :: .destroy()', function() {

    /////////////////////////////////////////////////////
    // TEST SETUP
    ////////////////////////////////////////////////////

    var stadiumRecord, teamRecord, edgeRecord;

    before(function(done) {
      Associations.Stadium.create({ name: 'hasManyThrough stadium destroy'}, function(err, stadium) {
        if(err) { return done(err); }
        stadiumRecord = stadium;
        
        Associations.Team.create({ name: 'hasManyThrough team destroy', mascot: 'elephant' }, function(err, team) {
          if(err) { return done(err); }
          teamRecord = team;
          
          stadiumRecord.teams.add(teamRecord.id);
          stadiumRecord.save(function(err){
            if(err) { return done(err); }
            
            Associations.Venue.findOne({ out: stadiumRecord.id }, function(err, edge){
              if(err) { return done(err); }
              edgeRecord = edge;
              done();
            });
          });
        });
      });
    });

    describe('with an object', function() {

      /////////////////////////////////////////////////////
      // TEST METHODS
      ////////////////////////////////////////////////////

      it('should delete the edge linking stadium and team', function(done) {
        Associations.Venue.destroy({ id: edgeRecord.id }, function(err, edges){
          if(err) { return done(err); }
          assert.equal(edges[0].id, edgeRecord.id);
          
          Associations.Venue.find({ id: edgeRecord.id }, function(err, edges){
            if(err) { return done(err); }
            assert.equal(edges.length, 0);
            done();
          });
          
        });
      });
      
    }); 
      
  });  
});
