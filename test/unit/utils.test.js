/**
 * Test dependencies
 */
var assert = require('assert'),
    utils = require('../../lib/utils');


describe('utils helper class', function () {

	it('isJunctionTableThrough: should correctly identify a junctionTable of a Many-to-Many Through collection', function (done) {
		var testCollection1 = {
		  junctionTable: false,
		  tables: ['driver', 'taxi'],
		  identity: 'driver_taxis__taxi_drivers',
		  tableName: 'driver_taxis__taxi_drivers'
		};
		assert(!utils.isJunctionTableThrough(testCollection1));
		
    var testCollection2 = {
      junctionTable: true,
      tables: ['driver', 'taxi'],
      identity: 'taxi_drivers',
      tableName: 'taxi_drivers_table'
    };
    assert(!utils.isJunctionTableThrough(testCollection2));
		
		var testCollection3 = {
      junctionTable: true,
      identity: 'taxi_drivers',
      tableName: 'taxi_drivers_table'
    };
		assert(utils.isJunctionTableThrough(testCollection3));
		
		var testCollection4 = {
      junctionTable: true,
      identity: 'driver_taxis__taxi_drivers',
      tableName: 'driver_taxis__taxi_drivers'
    };
    assert(!utils.isJunctionTableThrough(testCollection4));
		
		done();
	});
});
