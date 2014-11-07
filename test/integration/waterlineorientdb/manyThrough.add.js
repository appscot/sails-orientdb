var assert = require('assert'),
    _ = require('lodash');

describe('Association Interface', function() {

  describe('Has Many Through Association', function() {

    /////////////////////////////////////////////////////
    // TEST SETUP
    ////////////////////////////////////////////////////

    var stadiumRecord, teamRecord;

    before(function(done) {
      Associations.Stadium.create({ name: 'hasManyThrough stadium'}, function(err, stadium) {
        if(err) return done(err);
        stadiumRecord = stadium;
          Associations.Team.create({ name: 'hasManyThrough team', mascot: 'elephant' }, function(err, team) {
            if(err) return done(err);
            teamRecord = team;
            done();
        });
      });
    });

    describe('.add', function() {

      /////////////////////////////////////////////////////
      // TEST METHODS
      ////////////////////////////////////////////////////

      it('should link a stadium to a team through a join table', function(done) {
        stadiumRecord.teams.add(teamRecord.id);
        stadiumRecord.save(function(err){
          assert(!err, err);
        
          Associations.Stadium.findOne(stadiumRecord.id)
          .populate('teams')
          .exec(function(err, stadium) {
            assert(!err, err);
  
            assert(Array.isArray(stadium.teams));
            assert(stadium.teams.length === 1);
            assert(stadium.teams[0].mascot === 'elephant');
  
            done();
          });
        });
      });

      xit('should not return a teams object when the populate is not added', function(done) {
        Associations.Stadium.find()
        .exec(function(err, stadiums) {
          assert(!err);

          var obj = stadiums[0].toJSON();
          assert(!obj.teams);

          done();
        });
      });

      xit('should call toJSON on all associated records if available', function(done) {
        Associations.Stadium.find({ name: 'hasManyThrough stadium' })
        .populate('teams')
        .exec(function(err, stadiums) {
          assert(!err, err);

          var obj = stadiums[0].toJSON();

          assert(Array.isArray(obj.teams));
          assert(obj.teams.length === 1);
          assert(!obj.teams[0].mascot);

          done();
        });
      });

    });
  });
});
