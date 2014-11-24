/**
 * Test dependencies
 */
var assert = require('assert'),
    util = require('util'),
    Associations = require('../../lib/associations');
    associations = new Associations({ config: { fetchPlanLevel: 3 }});
    
describe('associations class', function () {
  
  it('getVerticesFromEdges: should extract vertices from edges in several different scenarios', function (done) {
    
    var singleEdgeId = associations.getVerticesFromEdges('#14:0', 'out');
    assert.equal(singleEdgeId.length, 0, 'singe edge id');
    
    var edgeRefs = associations.getVerticesFromEdges(['14:0', '#14:1'], 'out');
    assert.equal(edgeRefs.length, 0);
    
    var singleEdgeVertexId = associations.getVerticesFromEdges({ out: '#13:2' }, 'out');
    assert.equal(singleEdgeVertexId.length, 1);
    assert.equal(singleEdgeVertexId[0].id, '#13:2');
    
    var singleEdgeVertexObject = associations.getVerticesFromEdges({ out: { '@rid': '#13:2' } }, 'out');
    assert.equal(singleEdgeVertexObject.length, 1);
    assert.equal(singleEdgeVertexObject[0]['@rid'], '#13:2');
    
    var edgeArrayVertexId = associations.getVerticesFromEdges([{ out: '#13:2' }], 'out');
    assert.equal(edgeArrayVertexId.length, 1);
    assert.equal(edgeArrayVertexId[0].id, '#13:2', 'actual edgeArrayVertexId: ' + util.inspect(edgeArrayVertexId));
    
    var edgeArrayVertexObject = associations.getVerticesFromEdges([{ out: { '@rid': '#13:2' } }], 'out');
    assert.equal(edgeArrayVertexObject.length, 1);
    assert.equal(edgeArrayVertexObject[0]['@rid'], '#13:2');
    
    var edgeArrayMixedObjects = associations.getVerticesFromEdges([{ out: { '@rid': '#13:2' } }, { out: '#13:1' }, '14:0', '#14:1'], 'out');
    assert.equal(edgeArrayMixedObjects.length, 2);
    assert.equal(edgeArrayMixedObjects[0]['@rid'], '#13:2');
    assert.equal(edgeArrayMixedObjects[1].id, '#13:1');
    
    done();
  });
  
});