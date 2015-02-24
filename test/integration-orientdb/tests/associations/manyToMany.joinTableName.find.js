var assert = require('assert'),
    _ = require('lodash');

describe('Association Interface', function() {

  describe('n:m association :: tableName attribute', function() {

    /////////////////////////////////////////////////////
    // TEST SETUP
    ////////////////////////////////////////////////////

    var driverRecord;

    before(function(done) {  
      Associations.Driver.create({ name: 'manymany find'}, function(err, driver) {
        if(err) return done(err);

        driverRecord = driver;

        var taxis = [];
        for(var i=0; i<2; i++) {
          driverRecord.taxis.add({ medallion: i });
        }

        driverRecord.save(function(err) {
          if(err) return done(err);
          done();
        });
      });
    });

    /////////////////////////////////////////////////////
    // TEST METHODS
    ////////////////////////////////////////////////////

    it('should return "drives" as join table name', function(done) {
      Associations.Driver_taxis__taxi_drivers.native(function(collection){
        assert.equal(collection.name, 'drives');
        done();
      });
    });
    
    it('should return "E" (edge) as join table\'s super class', function(done) {
      Associations.Driver_taxis__taxi_drivers.native(function(collection){
        assert.equal(collection.superClass, 'E');
        done();
      });
    });

    it('should return taxis when the populate criteria is added', function(done) {
      Associations.Driver.find({ name: 'manymany find' })
      .populate('taxis')
      .exec(function(err, drivers) {
        assert(!err);

        assert(Array.isArray(drivers));
        assert(drivers.length === 1);
        assert(Array.isArray(drivers[0].taxis));
        assert(drivers[0].taxis.length === 2);

        done();
      });
    });

    it('should not return a taxis object when the populate is not added', function(done) {
      Associations.Driver.find()
      .exec(function(err, drivers) {
        assert(!err);

        var obj = drivers[0].toJSON();
        assert(!obj.taxis);

        done();
      });
    });

    it('should call toJSON on all associated records if available', function(done) {
      Associations.Driver.find({ name: 'manymany find' })
      .populate('taxis')
      .exec(function(err, drivers) {
        assert(!err);

        var obj = drivers[0].toJSON();
        assert(!obj.name);

        assert(Array.isArray(obj.taxis));
        assert(obj.taxis.length === 2);

        assert(obj.taxis[0].hasOwnProperty('createdAt'));
        assert(!obj.taxis[0].hasOwnProperty('medallion'));
        assert(obj.taxis[1].hasOwnProperty('createdAt'));
        assert(!obj.taxis[1].hasOwnProperty('medallion'));

        done();
      });
    });

  });
});
