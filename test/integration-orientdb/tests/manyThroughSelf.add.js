var assert = require('assert'),
    _ = require('lodash');

describe('Association Interface', function() {

  describe('Has Many Through Association', function() {

    /////////////////////////////////////////////////////
    // TEST SETUP
    ////////////////////////////////////////////////////

    var friendRecord, followeeRecord, followerRecord;

    before(function(done) {
      Associations.Friend.create({ name: 'hasManyThrough friend'}, function(err, friend) {
        if(err) return done(err);
        friendRecord = friend;
          Associations.Friend.create({ name: 'hasManyThrough followee' }, function(err, followee) {
            if(err) return done(err);
            followeeRecord = followee;
              Associations.Friend.create({ name: 'hasManyThrough follower' }, function(err, follower) {
              if(err) return done(err);
              followerRecord = follower;
              done();
          });
        });
      });
    });

    describe('.add', function() {

      /////////////////////////////////////////////////////
      // TEST METHODS
      ////////////////////////////////////////////////////

      it('should link a friend to a followee through a join table', function(done) {
        friendRecord.followees.add(followeeRecord.id);
        friendRecord.save(function(err){
          assert(!err, err);
        
          Associations.Friend.findOne(friendRecord.id)
          .populate('followees')
          .exec(function(err, friend) {
            assert(!err, err);
  
            assert(Array.isArray(friend.followees));
            assert(friend.followees.length === 1);
            assert(friend.followees[0].name === 'hasManyThrough followee');
            
            done();
          });
        });
      });
      
      xit('should populate a followee with followers through a join table', function(done) {
        //TODO: depends on previous test, add EventEmitter2's mediator so tests can be ran async safely
        Associations.Friend.findOne(followeeRecord.id)
          .populate('followers')
          .exec(function(err, followed) {
            assert(!err, err);
            
            assert(Array.isArray(followed.followers));
            assert(followed.followers.length === 1, 'actual length: ' + followed.followers.length);
            assert(followed.followers[0].name === 'hasManyThrough friend');
            
            done();
          });
      });
      
      xit('should link a friend to a follower through a join table', function(done) {
        friendRecord.followers.add(followerRecord.id);
        friendRecord.save(function(err){
          assert(!err, err);
        
          Associations.Friend.findOne(followerRecord.id)
          .populate('followees')
          .exec(function(err, follower) {
            assert(!err, err);
  
            assert(Array.isArray(follower.followees));
            assert(follower.followees.length === 1, 'actual length: ' + follower.followees.length);
            assert(follower.followees[0].name === 'hasManyThrough friend');
            
            done();
          });
        });
      });
      
      xit('should populate a friend with followers through a join table', function(done) {
        //TODO: depends on previous test, add EventEmitter2's mediator so tests can be ran async safely        
        Associations.Friend.findOne(friendRecord.id)
        .populate('followers')
        .exec(function(err, friend) {
          assert(!err, err);

          assert(Array.isArray(friend.followers));
          assert(friend.followers.length === 1, 'actual length: ' + friend.followers.length);
          assert(friend.followers[0].name === 'hasManyThrough follower');
          
          done();
        });
      });

    });
  });
});
