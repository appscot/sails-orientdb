var assert = require('assert');

var self = this;

describe('Bug #131: Undefined query parameters generated when populating optional one-way associations', function () {
  before(function (done) {

    var fixtures = {
      FileFixture: {
        identity: 'file',

        attributes: {
          name: {
            type : 'string',
            required : true
          }
        }
      },

      PersonFixture: {
        identity: 'person',

        attributes: {
          name: {
            type : 'string',
            required : true
          },
          avatar: {
            model: 'file'
          }
        }
      }
    };

    CREATE_TEST_WATERLINE(self, 'test_bug_131', fixtures, done);
  });

  after(function (done) {
    DELETE_TEST_WATERLINE('test_bug_131', done);
  });

  describe('... finding and populating a person created without an avatar', function () {

    /////////////////////////////////////////////////////
    // TEST SETUP
    ////////////////////////////////////////////////////

    before(function (done) {
      self.collections.Person.create({ name: 'mike' }, done);
    });


    /////////////////////////////////////////////////////
    // TEST METHODS
    ////////////////////////////////////////////////////

    it('should not try to send undefined parameters to the database', function (done) {
      self.collections.Person.getDB().on('beginQuery', function (query) {
        var params = query && query.params && query.params.params ?
          query.params.params : undefined;

        if (params) {
          for (var param in params) {
            if (params.hasOwnProperty(param)) {
              assert(params[param] !== undefined);
            }
          }
        }
      });

      self.collections.Person.find({ name: 'mike' }).populate('avatar').exec(done);
    });

  });
});
