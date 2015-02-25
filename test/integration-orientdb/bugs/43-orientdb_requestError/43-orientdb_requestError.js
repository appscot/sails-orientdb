var assert = require('assert'),
    _ = require('lodash'),
    utils = require('../../../../lib/utils');

var self = this;

describe('Bug #43: OrientDB.RequestError on update', function() {
  before(function (done) {
    var fixtures = {
      ImageFixture: require('./image.fixture'),
      SubprofileFixture: require('./post.fixture'),
      UserFixture: require('./user.fixture')
    };
    CREATE_TEST_WATERLINE(self, 'test_bug_43', fixtures, done);
  });
  after(function (done) {
    DELETE_TEST_WATERLINE('test_bug_43', done);
  });

  describe('rodrigorn: update a created post', function() {
    /////////////////////////////////////////////////////
    // TEST SETUP
    ////////////////////////////////////////////////////
  
    var postRecord, imageParent;
  
    before(function(done) {
      self.collections.Post.create({ title: 'a post' }, function(err, post) {
        if(err) { return done(err); }
        postRecord = post;
        
        self.collections.Image.create({ name: 'parent', crops: [ { name: 'crop' } ] }, function(err, img) {
          if(err) { return done(err); }
          imageParent = img;
          
          self.collections.Post.findOne(postRecord.id, function(err, thePost){
            assert(!err);
            assert(thePost);
            
            thePost.image = img.id;
            
            self.collections.Post.update(postRecord.id, thePost, function(err, postUpdated){
              if(err) { return done(err); }
              done();             
            });
          });   
        });    
      });
    });
  
  
    /////////////////////////////////////////////////////
    // TEST METHODS
    ////////////////////////////////////////////////////
      
    it('should update a post', function(done) {
      self.collections.Post.findOne(postRecord.id)
        .then(function(post){
          assert(post);
          
          post.title = 'new title';
          
          self.collections.Post.update(post.id, post, function(err, post2){
            assert(!err, err);
            assert.equal(post.title, 'new title');
            done();
          });
        })
        .error(done);
    });
    
    it('control test: should have a crop associated', function(done) {
      self.collections.Image.findOne(imageParent.id)
        .populate('crops')
        .exec(function(err, imgParent) {
          if(err) { return done(err); }
          assert.equal(imgParent.crops[0].name, 'crop');
          done();
      }); 
    });
    
    it('control test: should have a crop associated', function(done) {
      self.collections.Image.findOne(imageParent.id)
        .exec(function(err, imgParent) {
          if(err) { return done(err); }
          
          imgParent.isCrop = false;
          self.collections.Image.update(imageParent.id, imgParent, function(err, res){
            if(err) { return done(err); }
            assert.equal(imgParent.isCrop, false);
            done();
          });
      }); 
    });
    
    it('control test: should have a crop associated', function(done) {
      self.collections.Image.findOne(imageParent.id)
        .exec(function(err, imgParent) {
          if(err) { return done(err); }
          
          imgParent.isCrop = false;
          self.collections.Image.update(imageParent.id, imgParent, function(err, res){
            if(err) { return done(err); }
            assert.equal(imgParent.isCrop, false);
            done();
          });
      }); 
    });
    
  });
  
  
  describe('stackoverflow issue: update a created user', function() {
    /////////////////////////////////////////////////////
    // TEST SETUP
    ////////////////////////////////////////////////////
  
    var userParent, userChild;
  
    before(function(done) {
      self.collections.Dbuser.create({ username: 'parent' }, function(err, user) {
        if(err) { return done(err); }
        userParent = user;
        
        self.collections.Dbuser.create({ username: 'child' }, function(err, user2) {
          if(err) { return done(err); }
          userChild = user2;
          
          self.collections.Dbuser.findOne(userParent.id, function(err, dbUser){
            if(err) { return done(err); }
            dbUser.follows.add(user2.id);
            dbUser.save(done);
          })
          
        });
      });
    });
  
  
    /////////////////////////////////////////////////////
    // TEST METHODS
    ////////////////////////////////////////////////////
    
    it('control test: should have created child user', function(done) {
      self.collections.Dbuser.findOne({ username: 'child' })
        .populate('followed')
        .exec(function(err, user) {
          assert(!err, err);
          assert.equal(user.username, 'child');
          assert.equal(user.followed[0].username, 'parent');
          done();
      }); 
    });
    
    it('should update user', function(done) {
      userParent.token = 'iasbdasgdpsabçefbe';
      self.collections.Dbuser.update(userParent.id, userParent, function(err, user) {
        if(err) { return done(err); }
        assert(user);
        done();
      });
    });
    
    it('should create 2 users who reference each other', function(done) {
      self.collections.Dbuser.update({ username: 'user1', follows: [ { username: 'user2' } ] }, function(err, user) {
        if(err) { return done(err); }
        assert(user);
        done();
      });
    });
    
  });
  
});
