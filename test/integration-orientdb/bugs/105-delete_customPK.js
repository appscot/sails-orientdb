var assert = require('assert');

var self = this;

describe('Bug #105: delete fails when using custom PK', function () {
  before(function (done) {

    var fixtures = {
      UserFixture: {
        identity: 'user',
        autoPK: false,

        attributes: {
          sid: {
            type: 'string',
            primaryKey: true,
            unique: true,
            required: true
          },
          name: {
            type: 'string'
          }
        }
      }
    };

    CREATE_TEST_WATERLINE(self, 'test_bug_105', fixtures, done);
  });
  after(function (done) {
    DELETE_TEST_WATERLINE('test_bug_105', done);
  });

  describe('delete user', function () {
    
    /////////////////////////////////////////////////////
    // TEST SETUP
    ////////////////////////////////////////////////////
    
    before(function (done) {
      self.collections.User.create({ sid: 'user1', name: 'john' }, done);
    });
    
    
    /////////////////////////////////////////////////////
    // TEST METHODS
    ////////////////////////////////////////////////////
    
    it('should delete user successfully', function (done) {
      self.collections.User.destroy({ name: 'john' }, function (err, users) {
        if (err) {  return done(err); }
        assert(users[0]);
        done();
      });
    });

  });
});
