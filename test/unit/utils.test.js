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
	
	
	it('reduceNestedObjects: should properly traverse nested objects and reduce them', function (done) {
	  var callback = function(accumulator, obj, key){
	    if(!obj.id)
	      return accumulator;
	      
	    if(!accumulator[obj.id])
	      accumulator[obj.id] = 1;
	    else
        accumulator[obj.id]++;
        
      return accumulator;
	  };
	  
	  var collection1 = { id: '#13:1' };
	  var result = utils.reduceNestedObjects(collection1, callback, {});
	  assert.equal(Object.keys(result).length, 1);
	  assert.equal(result['#13:1'], 1);
	  
	  
	  var collection2 = { id: '#13:1', name: 'John Dow', child: { id: '#13:2'} };
	  var result = utils.reduceNestedObjects(collection2, callback, {});
    assert.equal(Object.keys(result).length, 2);
    assert.equal(result['#13:2'], 1);
    
    
    var collection3 = { id: '#13:1', name: 'John Dow', child: { id: '#13:2'}, noId: {name: 'Miles'} };
    var result = utils.reduceNestedObjects(collection3, callback, {});
    assert.equal(Object.keys(result).length, 2);
    
    
    var collection4 = { id: '#13:1', name: 'John Dow', children: [{ id: '#13:2'}, { id: '#13:3'}]};
    var result = utils.reduceNestedObjects(collection4, callback, {});
    assert.equal(Object.keys(result).length, 3);
    assert.equal(result['#13:3'], 1);
    
    
    var collection5 = { id: '#13:1', name: 'John Dow', children: [{ id: '#13:2'}, { id: '#13:3', parent: { id: '#13:1' }}]};
    var result = utils.reduceNestedObjects(collection5, callback, {});
    assert.equal(Object.keys(result).length, 3);
    assert.equal(result['#13:3'], 1);
    assert.equal(result['#13:2'], 1);
    assert.equal(result['#13:1'], 2);
	  
	  done();
	});
	
	
  it('forEachNested: should properly traverse nested properties applying callback', function (done) {
    var result = {};
    var callback = function(value, key, parent){
      result[value] = key;
    };
    
    var collection1 = { id: '#13:1' };
    utils.forEachNested(collection1, callback);
    assert.equal(Object.keys(result).length, 1);
    assert.equal(result['#13:1'], 'id');
    
    
    var collection2 = { id: '#13:1', name: 'John Dow', child: { id: '#13:2'} };
    utils.forEachNested(collection2, callback);
    assert.equal(Object.keys(result).length, 3);
    assert.equal(result['#13:2'], 'id');
    assert.equal(result['John Dow'], 'name');
    
    
    var collection3 = { id: '#13:1', name: 'John Dow', child: { id: '#13:2'}, noId: {name: 'Miles'} };
    utils.forEachNested(collection3, callback);
    assert.equal(Object.keys(result).length, 4);
    assert.equal(result['Miles'], 'name');
    
    
    var collection4 = { id: '#13:1', name: 'John Dow', children: [{ id: '#13:2'}, { id: '#13:3'}]};
    utils.forEachNested(collection4, callback);
    assert.equal(Object.keys(result).length, 5);
    assert.equal(result['#13:3'], 'id');
    
    var collection5 = { id: '#13:1', name: 'John Dow', children: [{ id: '#13:2'}, { id: '#13:3', parent: { id: '#10:1' }}]};
    utils.forEachNested(collection5, callback);
    assert.equal(Object.keys(result).length, 6);
    assert.equal(result['#10:1'], 'id');
    
    var collection6 = [collection5, {id: '#1:1'}];
    utils.forEachNested(collection6, callback);
    assert.equal(Object.keys(result).length, 7);
    assert.equal(result['#1:1'], 'id');
    
    
    var modifyCollection5Callback = function(value, key, parent){
      if(key === 'id')
        parent[key] = value + '_new';
    };
    utils.forEachNested(collection5, modifyCollection5Callback);
    assert.equal(Object.keys(collection5).length, 3);
    assert.equal(collection5.id, '#13:1_new');
    assert.equal(collection5.children[0].id, '#13:2_new');
    assert.equal(collection5.children[1].id, '#13:3_new');
    assert.equal(collection5.children[1].parent.id, '#10:1_new');
    
    
    done();
  });
  
  
  it('forEachNested: check arguments provided to callback are correct', function (done) {
    var result = [];
    var callback = function(value, key, parent){
      result.push({ value: value, key: key, parent: parent });
    };
    
    var collection1 = { id: '#13:1' };
    utils.forEachNested(collection1, callback);
    assert.equal(Object.keys(result).length, 1);
    assert.equal(result[0].value, '#13:1');
    assert.equal(result[0].key, 'id');
    assert.equal(result[0].parent.id, '#13:1');
    
    result.splice(0, result.length);
    var collection2 = { id: '#13:1', name: 'John Dow', child: { id: '#13:2'} };
    utils.forEachNested(collection2, callback);
    assert.equal(Object.keys(result).length, 3);
    assert.equal(result[0].key, 'id');
    assert.equal(result[0].value, '#13:1');
    assert.equal(result[0].parent.id, '#13:1');
    assert.equal(result[1].value, 'John Dow');
    assert.equal(result[1].key, 'name');
    assert.equal(result[1].parent.id, '#13:1');
    assert.equal(result[2].value, '#13:2');
    assert.equal(result[2].key, 'id');
    assert.equal(result[2].parent.id, '#13:2');
    
    var testParentCallback = function(value, key, parent){
      assert(parent[key] === value);
    };
    
    utils.forEachNested(collection2, testParentCallback);
    
    var collection5 = { id: '#13:1', name: 'John Dow', children: [{ id: '#13:2'}, { id: '#13:3', parent: { id: '#10:1' }}]};
    utils.forEachNested(collection5, testParentCallback);
    
    done();
  });
	
});
