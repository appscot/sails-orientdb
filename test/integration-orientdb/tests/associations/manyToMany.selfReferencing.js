var assert = require('assert'),
    _ = require('lodash');

var self = this,
    fixtures;
    
describe('Association Interface', function() {

  describe('n:m association :: self-reference', function() {

    /////////////////////////////////////////////////////
    // TEST SETUP
    ////////////////////////////////////////////////////

    var driverRecord;

    before(function (done) {
    
      fixtures = {
        UserFixture : {
          identity : 'user',
          attributes : {
            name : 'string',
            follows : {
              collection : 'user',
              via : 'followedBy',
              dominant: true
            },
            followedBy : {
              collection : 'user',
              via : 'follows'
            },
            relationships : function(){
              if(!this.follows) { return this.followedBy || []; };
              if(!this.followedBy) { return this.follows || []; };
              return this.follows.concat(this.followedBy);
            }
          }
        }
      };
  
      CREATE_TEST_WATERLINE(self, 'test_mn_slreferencing', fixtures, function(err){
        if(err) {
          console.log(err);
          return done(err);
        }
        done();
      });
    });
    after(function (done) {
      DELETE_TEST_WATERLINE('test_mn_slreferencing', done);
    });
    
    describe('userA --follows--> userB --follows--> userC', function() {
      
      var userA, userB, userC;
      
      before(function (done) {
        self.collections.User.create([{ name: 'userA' }, { name: 'userB' }, { name: 'userC' }])
          .then(function(users){
            userA = users[0];
            userB = users[1];
            userC = users[2];
            
            userA.follows.add(userB);
            return userA.save();
          })
          .then(function(){
            userB.follows.add(userC);
            return userB.save();
            // userA  --follows-->  userB  --follows-->  userC
            // userC --followedBy--> userB --followedBy--> userA
          })
          .then(function(){ done(); })
          .catch(done);
      });
  
      /////////////////////////////////////////////////////
      // TEST METHODS
      ////////////////////////////////////////////////////
  
      it('userA should follow userB and not be followed by anyone', function(done) {
        self.collections.User.findOne(userA.id)
          .populate('follows')
          .populate('followedBy')
          .then(function(user){
            assert.equal(user.name, 'userA');
            assert.equal(user.follows.length, 1);
            assert.equal(user.follows[0].name, 'userB');
            assert.equal(user.followedBy.length, 0);
            assert.equal(user.relationships().length, 1);
            assert.equal(user.relationships()[0].name, 'userB');
            done();
          })
          .catch(done);
      });
      
      it('userB should follow userC and be followed by userA', function(done) {
        self.collections.User.findOne(userB.id)
          .populate('follows')
          .populate('followedBy')
          .then(function(user){
            assert.equal(user.name, 'userB');
            assert.equal(user.follows.length, 1);
            assert.equal(user.follows[0].name, 'userC');
            assert.equal(user.followedBy.length, 1);
            assert.equal(user.followedBy[0].name, 'userA');
            assert.equal(user.relationships().length, 2);
            assert.equal(user.relationships()[0].name, 'userC');
            assert.equal(user.relationships()[1].name, 'userA');
            done();
          })
          .catch(done);
      });
      
      it('userC should not follow anyone and be followed by userB', function(done) {
        self.collections.User.findOne(userC.id)
          .populate('follows')
          .populate('followedBy')
          .then(function(user){
            assert.equal(user.name, 'userC');
            assert.equal(user.follows.length, 0);
            assert.equal(user.followedBy.length, 1);
            assert.equal(user.followedBy[0].name, 'userB');
            assert.equal(user.relationships().length, 1);
            assert.equal(user.relationships()[0].name, 'userB');
            done();
          })
          .catch(done);
      });
      
    });
  });
});
