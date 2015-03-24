var assert = require('assert'),
    _ = require('lodash'),
    utils = require('../../../../lib/utils');

describe('Association Interface', function() {

  describe('n:m through association :: .update', function() {

    /////////////////////////////////////////////////////
    // TEST SETUP
    ////////////////////////////////////////////////////

    var stadiumRecord, teamRecord;

    before(function(done) {
      Associations.Stadium.create({ name: 'update stadium' }, function(err, stadium) {
        if(err) return done(err);
        stadiumRecord = stadium;
        Associations.Team.create({ name: 'populate team', mascot: 'elephant' }, function(err, team) {
          if(err) return done(err);
          teamRecord = team;
          stadiumRecord.teams.add(teamRecord.id);
          stadiumRecord.save(function(err){
            assert(!err, err);
            done();
          });
        });
      });
    });
        
    /////////////////////////////////////////////////////
    // TEST METHODS
    ////////////////////////////////////////////////////
    describe('update operations should not impact associations', function() {
      
      it('update record without populate with association using collection.update()', function(done) {
        Associations.Stadium.findOne(stadiumRecord.id)
          .then(function(stadium){
            assert.equal(stadium.teams.length, 0);
            assert.equal(stadium.name, 'update stadium');
            
            //var updatedStadium = _.merge(stadium, { name: 'update stadium updated' });
            return Associations.Stadium.update(stadiumRecord.id, { name: 'update stadium updated' });
          })
          .then(function(){
            return Associations.Stadium.findOne(stadiumRecord.id)
             .populate('teams');
          })
          .then(function(updatedStadium){
            assert.equal(updatedStadium.name, 'update stadium updated');
            assert.equal(updatedStadium.teams.length, 1);
            done();
          })
          .catch(done);
      });
      
    });
  });
});
    


