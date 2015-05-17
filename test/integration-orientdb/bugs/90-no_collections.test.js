var assert = require('assert');

var self = this;

describe('Bug #90: instantiate waterline without collections', function () {

  describe('instantation', function () {
    
    /////////////////////////////////////////////////////
    // TEST SETUP
    ////////////////////////////////////////////////////
    
    after(function (done) {
      DELETE_TEST_WATERLINE('test_bug_90', done);
    });
    
    
    /////////////////////////////////////////////////////
    // TEST METHODS
    ////////////////////////////////////////////////////
    
    it('should be able to save changes on model returned by create', function (done) {
      CREATE_TEST_WATERLINE(self, 'test_bug_90', {}, function (err) {
        assert(!err, err);
        done();
      });
    });

  });
});
