/**
 * Test dependencies
 */
var assert = require('assert'),
    util = require('util'),
    Associations = require('../../lib/associations');
    
var collections = {
  comment: require('./fixtures/comment.model'),
  profile: require('./fixtures/profile.model'),
  recipe_content: require('./fixtures/recipeContent.model'),
  authored_comment: require('./fixtures/authoredComment.model'),
  comment_parent: require('./fixtures/commentParent.model'),
  comment_recipe: require('./fixtures/commentRecipe.model')
};
    
var associations = new Associations({ 
      config: { fetchPlanLevel: 3 },
      collections: collections,
      collectionsByIdentity: collections
      });
    
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
  
  it('getFetchPlan: check fetch plan query is built correctly',function(done){
    var joins = [
      {
        "parent": "comment",
        "parentKey": "id",
        "child": "authored_comment",
        "childKey": "commentRef",
        "select": false,
        "alias": "author",
        "removeParentKey": false,
        "model": false,
        "collection": true
      },
      {
        "parent": "authored_comment",
        "parentKey": "profileRef",
        "child": "profile",
        "childKey": "id",
        "select": false,
        "alias": "author",
        "junctionTable": true,
        "removeParentKey": false,
        "model": false,
        "collection": true,
        "criteria": { "where": {}}
      },
      {
        "parent": "comment",
        "parentKey": "id",
        "child": "comment_parent",
        "childKey": "childRef",
        "select": false,
        "alias": "parent",
        "removeParentKey": false,
        "model": false,
        "collection": true
      },
      {
        "parent": "comment_parent",
        "child": "comment",
        "childKey": "id",
        "select": false,
        "alias": "parent",
        "junctionTable": true,
        "removeParentKey": false,
        "model": false,
        "collection": true,
        "criteria": { "where": {}} }
    ];
    
    var fetchPlan = associations.getFetchPlan('comment', { joins: joins });
    assert.equal(fetchPlan, 'in_authored_comment:1 in_authored_comment.out:1 out_comment_parent:1 out_comment_parent.in:1 out_comment_recipe:1');
    
    done();
  });
  
  
  
});