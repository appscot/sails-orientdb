var assert = require('assert'),
  _ = require('lodash'),
  async = require('async');

describe('Adapter Custom Methods', function () {

  describe.only('increment', function () {
    
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
      
      it('should increment multiple times without returning duplicates', function (done) {
        var opsNumber = 50;
        async.map(Array.apply(0, Array(opsNumber)), function (val, next){
          Associations.Counter.increment({ name: 'counter1' }, 'value')
          .then(function (counter) {
            next(null, counter.value);
          }).catch(next);
        }, 
        function complete(err, results){
          assert.equal(err, null);
          
          var uniqueCounts = _.unique(results);
          assert.strictEqual(uniqueCounts.length, opsNumber);
          done();
        });
        
        
      });

    });
  });
});