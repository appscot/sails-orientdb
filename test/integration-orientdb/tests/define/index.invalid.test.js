var assert = require('assert');

var self = this,
    fixtures;
    
describe('Define related Operations', function() {

  describe('Indexes', function() {

    /////////////////////////////////////////////////////
    // TEST SETUP
    ////////////////////////////////////////////////////

    fixtures = {
      IndexFixture : {
        identity : 'thing',
        attributes : {
          name : 'string',
          indexFunky : {
            type : 'string',
            index: 'funky'
          }
        }
      }
    };
    
    
    /////////////////////////////////////////////////////
    // TEST METHODS
    ////////////////////////////////////////////////////

    it('should throw error while attempting to create invalid index', function(done) {
      CREATE_TEST_WATERLINE(self, 'test_index_invalid', fixtures, function(err){
        assert(err);
        assert(err.message.indexOf('Index funky is not supported') === 0);
        done();
      });
    });
      
  });
});
