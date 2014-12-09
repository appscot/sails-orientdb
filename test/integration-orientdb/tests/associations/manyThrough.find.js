var assert = require('assert'),
    _ = require('lodash');

describe('Association Interface', function() {

  describe('n:m through association :: .find()', function() {

    /////////////////////////////////////////////////////
    // TEST SETUP
    ////////////////////////////////////////////////////

    var stadiumRecord, teamRecord, ownerRecord;

    before(function(done) {
      Associations.Stadium.create({ name: 'populate stadium'}, function(err, stadium) {
        if(err) return done(err);
        stadiumRecord = stadium;
          Associations.Team.create({ name: 'populate team', mascot: 'elephant' }, function(err, team) {
            if(err) return done(err);
            teamRecord = team;
            
            Associations.Friend.create({ name: 'populate friend' }, function(err, owner) {
              if(err) return done(err);
              ownerRecord = owner;
              
              stadiumRecord.owners.add(ownerRecord.id);
              stadiumRecord.teams.add(teamRecord.id);
              stadiumRecord.save(function(err){
                assert(!err, err);
                done();
              });
            
            });
            
        });
      });
    });


    /////////////////////////////////////////////////////
    // TEST METHODS
    ////////////////////////////////////////////////////
    describe('without populate', function() {
      
      it('should not have team or friend records, nor edges', function(done) {
        Associations.Stadium.findOne(stadiumRecord.id)
          .then(function(stadium){
            assert(stadium.teams.length === 0);
            assert(stadium.owners.length === 0);
            assert(!stadium.out_venueTable);
            assert(!stadium.in_ownsTable);
            assert(!stadium['@type']);
            done();
          })
          .catch(function(err){
            done(err);
          });
      });
    });

    describe('with populate', function() {
      
      it('should not have friend records, nor edges', function(done) {
        Associations.Stadium.findOne(stadiumRecord.id)
          .populate('teams')
          .then(function(stadium){
            assert(stadium.teams.length === 1);
            assert(stadium.owners.length === 0);
            assert(!stadium.out_venueTable);
            assert(!stadium.in_ownsTable);
            assert(!stadium.teams[0].in_venueTable);
            assert(!stadium['@type']);
            done();
          })
          .catch(function(err){
            done(err);
          });
      });
    });

    
  });  
});
