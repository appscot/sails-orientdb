var assert = require('assert'),
    _ = require('lodash'),
    utils = require('../../../../lib/utils');

var self = this;

describe('Bug #43: OrientDB.RequestError on update', function() {
  before(function (done) {
    var fixtures = {
      ImageFixture: require('./image.fixture'),
      SubprofileFixture: require('./post.fixture')
    };
    CREATE_TEST_WATERLINE(self, 'test_bug_43', fixtures, done);
  });
  after(function (done) {
    DELETE_TEST_WATERLINE('test_bug_43', done);
  });

  describe('update a created post', function() {
    /////////////////////////////////////////////////////
    // TEST SETUP
    ////////////////////////////////////////////////////
  
    var postRecord;
  
    before(function(done) {
      self.collections.Post.create({ title: 'a post' }, function(err, post) {
        if(err) { return done(err); }
        postRecord = post;
        done();        
      });
    });
  
  
    /////////////////////////////////////////////////////
    // TEST METHODS
    ////////////////////////////////////////////////////
      
    it('should update a post', function(done) {
      self.collections.Post.findOne(postRecord.id)
        .then(function(post){
          
          post.title = 'new title';
          
          self.collections.Post.update({ id: post.id }, post, done);
        })
        .catch(done);
    });
      

  });
});
