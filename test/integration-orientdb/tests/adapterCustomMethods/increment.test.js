var assert = require('assert'),
  _ = require('lodash');

describe('Adapter Custom Methods', function () {

  describe('increment', function () {
    
    /////////////////////////////////////////////////////
    // TEST SETUP
    ////////////////////////////////////////////////////
    
    before(function (done) {
      Associations.Counter.create({ name: 'counter1' }, function (err, counter) {
        if (err) return done(err);

        assert(counter);
        assert.strictEqual(counter.value, 0);
        done();
      });
    });


    describe('counter', function () {
      
      /////////////////////////////////////////////////////
      // TEST METHODS
      ////////////////////////////////////////////////////
      
      var lastCount = 0;
      
      it('should increment a field using the default value', function (done) {
        Associations.Counter.increment({ name: 'counter1' }, 'value', function (err, counter) {
          assert(!err);
          lastCount++;
          assert.strictEqual(counter.value, lastCount);
          done();
        });
      });
      
      it('should increment a field using the specified positive value', function (done) {
        Associations.Counter.increment({ name: 'counter1' }, 'value', 2)
        .then(function (counter) {
          lastCount = lastCount + 2;
          assert.strictEqual(counter.value, lastCount);
          done();
        }).catch(done);
      });
      
      it('should increment a field using the specified negative value', function (done) {
        Associations.Counter.increment({ name: 'counter1' }, 'value', -1)
        .then(function (counter) {
          lastCount--;
          assert.strictEqual(counter.value, lastCount);
          done();
        }).catch(done);
      });

    });
  });
});