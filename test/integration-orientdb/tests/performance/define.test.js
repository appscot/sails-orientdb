var assert = require('assert');

var self = this;
    
// Require Fixtures
var localFixturesPath = '../../fixtures/';

var fixtures = {
  TeamFixture: require(localFixturesPath + 'hasManyThrough.team.fixture.js'),
  StadiumFixture: require(localFixturesPath + 'hasManyThrough.stadium.fixture'),
  VenueFixture: require(localFixturesPath + 'hasManyThrough.venueHack.fixture'),
  FriendFixture: require(localFixturesPath + 'hasManyThrough.friend.fixture'),
  FollowsFixture: require(localFixturesPath + 'hasManyThrough.follows.fixture'),
  OwnsFixture: require(localFixturesPath + 'hasManyThrough.owns.fixture'),
  IndexesFixture: require(localFixturesPath + 'define.indexes.fixture'),
  PropertiesFixture: require(localFixturesPath + 'define.properties.fixture'),
  SchemalessPropertiesFixture: require(localFixturesPath + 'define.schemalessProperties.fixture')
};

describe('Performance', function() {
  after(function (done) {
    DELETE_TEST_WATERLINE('test_performance_define', done);
  });

  describe('define', function() {
  
    /////////////////////////////////////////////////////
    // TEST METHODS
    ////////////////////////////////////////////////////
    
    it('should define all fixtures in timely manner', function(done) {
      this.timeout(1500);
      console.time('performance_define');
      CREATE_TEST_WATERLINE(self, 'test_performance_define', fixtures, function(err){
        if(err) { done(err); }
        console.timeEnd('performance_define');
        done();
      });
    });

  });
});
