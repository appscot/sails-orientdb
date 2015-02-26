var assert = require('assert');

var self = this;

describe('Bug #06: Models returned from find() and create() are different', function() {
  before(function (done) {
  
    var fixtures = {
      UserFixture : {
        identity : 'user',
  
        attributes : {
          name : {
            type : 'string'
          },
          email : {
            type : 'email'
          },
        }
      }
    }; 

    CREATE_TEST_WATERLINE(self, 'test_bug_06', fixtures, done);
  });
  after(function (done) {
    DELETE_TEST_WATERLINE('test_bug_06', done);
  });

  describe('create user', function() {
    
    /////////////////////////////////////////////////////
    // TEST SETUP
    ////////////////////////////////////////////////////
    
    
    /////////////////////////////////////////////////////
    // TEST METHODS
    ////////////////////////////////////////////////////
    
    it('should be able to save changes on model returned by create', function(done) {
      self.collections.User.create({ name: 'john', email: 'email@example.com' }, function(err, user) {
        if(err) { return done(err); }
        assert(user);
        
        user.name = 'joe';
        user.save(function(err){
          if(err) { return done(err); }
          
          self.collections.User.findOne(user.id, function(err, usr){
            if(err) { return done(err); }
            assert(usr);
            assert.equal(usr.email, user.email);
            assert.equal(usr.name, 'joe');
            done();
          });
          
        });
      });
    });
    
  });
});
