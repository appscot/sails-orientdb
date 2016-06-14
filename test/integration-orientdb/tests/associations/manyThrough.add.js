var assert = require('assert'),
    _ = require('lodash');

describe('Association Interface', function() {

  describe('n:m through association :: .add()', function() {

    /////////////////////////////////////////////////////
    // TEST SETUP
    ////////////////////////////////////////////////////

    var stadiumRecord, teamRecord, stadiumMultiple, allTeams;

    before(function(done) {
      Associations.Stadium.create([{ name: 'hasManyThrough stadium'},
                                   { name: 'hasManyThrough multiple stadium'}], function(err, stadiums) {
        if(err) return done(err);
        stadiumRecord = stadiums[0];
        stadiumMultiple = stadiums[1];
        Associations.Team.create([{ name: 'hasManyThrough team', mascot: 'elephant' },
                                  { name: 'hasManyThrough team 1' },
                                  { name: 'hasManyThrough team 2'}], 
                                  function(err, teams) {
          if(err) return done(err);
          teamRecord = teams[0];
          allTeams = teams;
          done();
        });
      });
    });

    describe('with an object', function() {

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
            
            Associations.Stadium.findOne({'out().@rid': [teamRecord.id] })
            .exec(function(err, stadiumWhichHas) {
              assert(!err, err);
              
              assert(stadiumWhichHas, "Edge has wrong direction");
              assert(stadiumWhichHas.name === 'hasManyThrough stadium', "Edge has wrong direction");
              done();
            });
  
          });
        });
      });
      
      it('should link a stadium to several teams through a join table', function(done) {
        stadiumMultiple.teams.add(allTeams[1].id);
        stadiumMultiple.teams.add(allTeams[2].id);
        stadiumMultiple.save(function(err){
          if(err) { return done(err); }
        
          Associations.Stadium.findOne(stadiumMultiple.id)
          .populate('teams')
          .exec(function(err, stadium) {
            if(err) { return done(err); }
  
            assert(Array.isArray(stadium.teams));
            assert(stadium.teams.length === 2);
            assert(stadium.teams[0].name === 'hasManyThrough team 1');
            assert(stadium.teams[1].name === 'hasManyThrough team 2');
            done();
  
          });
        });
      });

      it('should link a team to a stadium through a join table', function(done) {
        //TODO: add EventEmitter2's mediator so tests can be ran async
        Associations.Team.findOne(teamRecord.id)
        .populate('stadiums')
        .exec(function(err, team) {
          assert(!err, err);

          assert(Array.isArray(team.stadiums));
            assert(team.stadiums.length === 1);
            assert(team.stadiums[0].name === 'hasManyThrough stadium');

          done();
        });
      });

    });
    
    describe('create nested associations()', function() {

      /////////////////////////////////////////////////////
      // TEST METHODS
      ////////////////////////////////////////////////////

      it('should create a new stadium and team and associate them', function(done) {
        Associations.Stadium.create({
          name: 'hasManyThrough aggregate stadium',
          teams: [{ name: 'hasManyThrough nested team' }] 
          }, 
          function(err, record) {
            assert(!err, err);
            
            Associations.Stadium.findOne(record.id)
              .populate('teams')
              .exec(function(err, stadium) {
                assert(!err, err);
                
                assert(Array.isArray(stadium.teams));
                assert(stadium.teams.length === 1);
                assert(stadium.teams[0].name === 'hasManyThrough nested team');
                done();
              });
        });
      });
      
      it('should create a new stadium, multiples teams and associate them', function(done) {
        Associations.Stadium.create({
          name: 'hasManyThrough aggregate stadium multiples',
          teams: [
            { name: 'hasManyThrough nested team 2' },
            { name: 'hasManyThrough nested team 3' }
          ] 
          }, 
          function(err, record) {
            assert(!err, err);
            
            Associations.Stadium.findOne(record.id)
              .populate('teams')
              .exec(function(err, stadium) {
                assert(!err, err);
                
                assert(Array.isArray(stadium.teams));
                assert(stadium.teams.length === 2);
                assert(stadium.teams[0].name === 'hasManyThrough nested team 2');
                assert(stadium.teams[1].name === 'hasManyThrough nested team 3');
                done();
              });
        });
      });
      
    });

  });  
});
