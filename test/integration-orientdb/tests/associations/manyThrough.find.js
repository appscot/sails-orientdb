var assert = require('assert'),
    _ = require('lodash');

describe('Association Interface', function() {

  describe('n:m through association :: .find()', function() {

    /////////////////////////////////////////////////////
    // TEST SETUP
    ////////////////////////////////////////////////////

    var stadiumRecord, teamRecord, ownerRecord;

    before(function(done) {
      Associations.Stadium.create({ name: 'populate stadium', sponsor: {name: 'someBrand'}}, function(err, stadium) {
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
      
      it('findOne: should not have team or friend records, nor edges', function(done) {
        Associations.Stadium.findOne(stadiumRecord.id)
          .then(function(stadium){
            assert(stadium.teams.length === 0);
            assert(stadium.owners.length === 0);
            assert(!stadium.out_venueTable);
            assert(!stadium.in_ownsTable);
            assert(!stadium['@type']);
            assert(_.isString(stadium.sponsor));
            done();
          })
          .catch(function(err){
            done(err);
          });
      });
      
      it('should not have team or friend records, nor edges', function(done) {
        Associations.Stadium.find(stadiumRecord.id)
          .then(function(stadiums){
            assert(stadiums[0].teams.length === 0);
            assert(stadiums[0].owners.length === 0);
            assert(!stadiums[0].out_venueTable);
            assert(!stadiums[0].in_ownsTable);
            assert(!stadiums[0]['@type']);
            assert(_.isString(stadiums[0].sponsor));
            done();
          })
          .catch(function(err){
            done(err);
          });
      });
    });

    describe('with populate', function() {
      
      it('findOne: should not have friend records, nor edges', function(done) {
        Associations.Stadium.findOne(stadiumRecord.id)
          .populate('teams')
          .populate('sponsor')
          .then(function(stadium){
            assert(stadium.teams.length === 1);
            assert(stadium.owners.length === 0);
            assert(!stadium.out_venueTable);
            assert(!stadium.in_ownsTable);
            assert(!stadium.teams[0].in_venueTable);
            assert(!stadium.teams[0]['@type']);
            assert(!stadium['@type']);
            assert(stadium.sponsor);
            assert(stadium.sponsor.name === 'someBrand');
            assert(!stadium.sponsor['@type']);
            done();
          })
          .catch(function(err){
            done(err);
          });
      });
      
      it('should not have friend records, nor edges', function(done) {
        Associations.Stadium.find(stadiumRecord.id)
          .populate('teams')
          .populate('sponsor')
          .then(function(stadiums){
            assert(stadiums[0].teams.length === 1);
            assert(stadiums[0].owners.length === 0);
            assert(!stadiums[0].out_venueTable);
            assert(!stadiums[0].in_ownsTable);
            assert(!stadiums[0].teams[0].in_venueTable);
            assert(!stadiums[0].teams[0]['@type']);
            assert(!stadiums[0]['@type']);
            assert(stadiums[0].sponsor);
            assert(stadiums[0].sponsor.name === 'someBrand');
            assert(!stadiums[0].sponsor['@type']);
            done();
          })
          .catch(function(err){
            done(err);
          });
      });
      
      it('findOne one-to-one: should not have team or friend records, nor edges', function(done) {
        Associations.Stadium.findOne(stadiumRecord.id)
          .populate('sponsor')
          .then(function(stadium){
            assert(!stadium['@type']);
            assert(stadium.sponsor);
            assert(stadium.sponsor.name === 'someBrand');
            assert(!stadium.sponsor['@type']);
            done();
          })
          .catch(function(err){
            done(err);
          });
      });
      
      it('findOne: should not have sponsor object', function(done) {
        Associations.Stadium.findOne(stadiumRecord.id)
          .populate('teams')
          .then(function(stadium){
            assert(stadium.teams.length === 1);
            assert(_.isString(stadium.sponsor));
            done();
          })
          .catch(function(err){
            done(err);
          });
      });
    });

    
  });  
});
