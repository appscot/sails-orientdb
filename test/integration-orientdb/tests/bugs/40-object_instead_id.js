var assert = require('assert'),
    _ = require('lodash'),
    utils = require('../../../../lib/utils');

describe('Bug #40 Returning object instead of id', function() {

  /////////////////////////////////////////////////////
  // TEST SETUP
  ////////////////////////////////////////////////////

  var profileRecord, subprofileRecord;

  before(function(done) {
    Associations.Profile40.create({ alias: 'juanito', birthday: "1-01-1980" }, function(err, profile) {
      if(err) { return done(err); }
      profileRecord = profile;
      Associations.Subprofile.create({ name: 'juan' }, function(err, subprofile) {
        if(err) { return done(err); }
        subprofileRecord = subprofile;
        
        profileRecord.profiles.add(subprofileRecord.id);
        profileRecord.save(function(err){
          if(err) { return done(err); }
          done();
        });
      });
    });
  });
  
  after(function(done){
    Associations.Profile40.destroy(profileRecord.id);
    Associations.Subprofile.destroy(profileRecord.id);
    done();
  });


  /////////////////////////////////////////////////////
  // TEST METHODS
  ////////////////////////////////////////////////////
  describe('find a profile', function() {
    
    it('should return a profile with a subprofile', function(done) {
      Associations.Profile40.find()
        .populate('profiles')
        .then(function(profiles){
          assert.equal(profiles.length, 1);
          assert.equal(profiles[0].id, profileRecord.id);
          done();
        })
        .catch(done);
    });
    
  });

  
});
