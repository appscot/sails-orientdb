var assert = require('assert');

describe('Adapter Custom Methods', function() {

  describe('runFunction', function() {
    
    /////////////////////////////////////////////////////
    // TEST SETUP
    ////////////////////////////////////////////////////
    
    before(function(done) {
      Associations.Friend.getDB(function(db) {
        db.createFn('runme1', function(str, str2) {
          str = str || '';
          str2 = str2 || '';
          return 'this ' + str + ' work' + str2;
        })
        .then(function() { done(); })
        .catch(done);
      });
    });

    /////////////////////////////////////////////////////
    // TEST METHODS
    ////////////////////////////////////////////////////
    
    it('should run a server function with 1 argument', function(done) {
      Associations.Friend.runFunction('runme1', 'does').from('OUser').limit(1).one()
        .then(function(res) {
          assert.equal(res.runme1, "this does work");
          done();
        })
        .catch(done);
    });
    
    it('should run a server function without params', function(done) {
      Associations.Friend.runFunction('runme1').from('OUser').limit(1).one()
        .then(function(res) {
          assert.equal(res.runme1, "this  work");
          done();
        })
        .catch(done);
    });
    
    it('should run a server function with multiple arguments', function(done) {
      Associations.Friend.runFunction('runme1', 'does', '!').from('OUser').limit(1).one()
        .then(function(res) {
          assert.equal(res.runme1, "this does work!");
          done();
        })
        .catch(done);
    });
    
  });

});