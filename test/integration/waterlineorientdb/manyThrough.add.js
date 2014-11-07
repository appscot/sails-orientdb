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

          Associations.Venue.create({ seats: 200, stadium: stadium.id, team: team.id }, function(err, venue) {
            if(err) return done(err);
            done();
          });
        });
      });
    });

    describe('.find', function() {

      /////////////////////////////////////////////////////
      // TEST METHODS
      ////////////////////////////////////////////////////

      it('should return teams when the populate criteria is added', function(done) {
        Associations.Stadium.find({ name: 'hasManyThrough stadium' })
        .populate('teams')
        .exec(function(err, stadiums) {
          assert(!err, err);

          assert(Array.isArray(stadiums));
          assert(stadiums.length === 1);
          assert(Array.isArray(stadiums[0].teams));
          assert(stadiums[0].teams.length === 1);

          done();
        });
      });

      it('should not return a teams object when the populate is not added', function(done) {
        Associations.Stadium.find()
        .exec(function(err, stadiums) {
          assert(!err);

          var obj = stadiums[0].toJSON();
          assert(!obj.teams);

          done();
        });
      });

      it('should call toJSON on all associated records if available', function(done) {
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
