/**
 * Test dependencies
 */
var assert = require('assert'),
    Query = require('../../lib/query');
    
var query = new Query({}, { config: { options: { decodeURIComponent: true } } });

describe('associations class', function () {
  
  var rid1 = '%231%3A4', decodedRid1 = '#1:4', rid2 = '%2322%3A33', decodedRid2 = '#22:33';
  
  it('decode: should decode an URI encoded RID string', function(done){
    assert.equal(query.decode(rid1), decodedRid1);
    assert.equal(query.decode(rid2), decodedRid2);
    
    done();
  });
  
  it('decode: should decode an URI encoded RID array', function(done){
    assert.deepEqual(query.decode([rid1, rid2]), [decodedRid1, decodedRid2]);
    
    done();
  });
  
  it('decode: should decode an URI encoded RID within criteria modifiers', function(done){
    assert.deepEqual(query.decode({ '!': rid1 }), { '!': decodedRid1 });
    assert.deepEqual(query.decode({ '!': [rid1, rid2] }), { '!': [decodedRid1, decodedRid2] });
    
    done();
  });
  
  it('decode: non URI encoded fields should pass transparently', function(done){
    var date = new Date();
    assert.equal(query.decode(decodedRid1), decodedRid1);
    assert.equal(query.decode(date), date);
    assert.deepEqual(query.decode([decodedRid1, decodedRid2]), [decodedRid1, decodedRid2]);
    assert.deepEqual(query.decode({ '!': decodedRid1 }), { '!': decodedRid1 });
    assert.deepEqual(query.decode({ '!': [decodedRid1, decodedRid2] }), { '!': [decodedRid1, decodedRid2] });
    
    done();
  });
  
});