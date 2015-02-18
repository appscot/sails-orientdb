var assert = require('assert'),
    _ = require('lodash'),
    utils = require('../../../../lib/utils');

var self = this;

describe('Bug #40: Returning object instead of id', function() {
  before(function (done) {
    var fixtures = {
      Profile40Fixture: require('./40.profile.fixture'),
      SubprofileFixture: require('./40.subprofile.fixture'),
      ProfileconnectionFixture: require('./40.profileconnection.fixture')
    };
    CREATE_TEST_WATERLINE(self, 'test_bug_40', fixtures, done);
  });
  after(function (done) {
    DELETE_TEST_WATERLINE('test_bug_40', done);
  });

  describe('find a profile', function() {
    /////////////////////////////////////////////////////
    // TEST SETUP
    ////////////////////////////////////////////////////
  
    var profileRecord, subprofileRecord;
  
    before(function(done) {
      self.collections.Profile40.create({ alias: 'juanito', birthday: "1-01-1980" }, function(err, profile) {
        if(err) { return done(err); }
        profileRecord = profile;
        self.collections.Subprofile.create({ name: 'juan' }, function(err, subprofile) {
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
  
  
    /////////////////////////////////////////////////////
    // TEST METHODS
    ////////////////////////////////////////////////////
      
    it('should return a profile with a subprofile', function(done) {
      self.collections.Profile40.find()
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
