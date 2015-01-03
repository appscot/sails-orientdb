/**
 * Test dependencies
 */
var assert = require('assert'),
    Document = require('../../lib/document'),
    RID = require('oriento').RID,
    _ = require('lodash'),
    util = require('util');


describe('document helper class', function () {
  
  var doc;
  
  before(function(done){
    doc = new Document();
    done();
  });

	it('normalizeId: should correctly normalize an id', function (done) {
		var collection1 = {
		  name: 'no id collection'
		};
		var testCollection1 = _.clone(collection1);
		doc.normalizeId(testCollection1);
		assert(_.isEqual(testCollection1, collection1));
		
		
		var testCollection2 = {
      name: 'id collection',
      id: '#1:0'
    };
    doc.normalizeId(testCollection2);
    assert(_.isUndefined(testCollection2.id));
    assert(testCollection2['@rid'] instanceof RID);
    assert.equal(testCollection2['@rid'].cluster, 1);
    assert.equal(testCollection2['@rid'].position, 0);
    assert(_.isEqual(testCollection2['@rid'], new RID('#1:0')), 'not equal to RID(\'#1:0\'), actual value: ' + util.inspect(testCollection2['@rid']));
		
		var testCollection3 = {
      name: 'id collection',
      '@rid': new RID('#2:0')
    };
    doc.normalizeId(testCollection3);
    assert(_.isUndefined(testCollection3.id));
    assert(_.isEqual(testCollection3['@rid'], new RID('#2:0')));
    
    var testCollection4 = {
      name: 'id collection',
      id: '#1:0',
      '@rid': new RID('#2:0')
    };
    doc.normalizeId(testCollection4);
    assert(_.isUndefined(testCollection4.id));
    assert(_.isEqual(testCollection4['@rid'], new RID('#1:0')));
		
		done();
	});
	
	
});
