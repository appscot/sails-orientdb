var assert = require('assert');

describe('Adapter Custom Methods', function() {

  describe('removeCircularReferences', function() {

    /////////////////////////////////////////////////////
    // TEST METHODS
    ////////////////////////////////////////////////////
    
    it('should remove circular references', function(done) {
      
      var collection1 = { id: '#13:1' };
      collection1.circ = collection1;
      assert.throws(function() { JSON.stringify(collection1); });
      
      var result = Associations.Friend.removeCircularReferences(collection1);
      assert.equal(result.circ, '#13:1');
      assert.doesNotThrow(function() { JSON.stringify(result); });
      done();
    });
    
  });

});