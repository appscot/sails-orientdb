/**
 * Test dependencies
 */
var assert = require('assert'),
    util = require('util'),
    Edge = require('../../lib/collection').Edge,
    Associations = require('../../lib/associations'),
    _ = require('lodash');
    
var collections = {
  comment: require('./fixtures/comment.model'),
  profile: require('./fixtures/profile.model'),
  recipe_content: require('./fixtures/recipeContent.model'),
  authored_comment: require('./fixtures/authoredComment.model'),
  comment_parent: require('./fixtures/commentParent.model'),
  comment_recipe: require('./fixtures/commentRecipe.model')
};

var connectionMock = { 
  config: { options: {fetchPlanLevel: 1} },
  collections: collections,
  collectionsByIdentity: collections
};

collections.authored_comment.waterline = { schema: {} };
collections.authored_comment.definition = collections.authored_comment.attributes;
collections.comment_parent.waterline = { schema: {} };
collections.comment_parent.definition = collections.comment_parent.attributes;
collections.comment_recipe.waterline = { schema: {} };
collections.comment_recipe.definition = collections.comment_recipe.attributes;
var newCollections = {
  authored_comment: new Edge(collections.authored_comment, connectionMock, null, collections),
  comment_parent: new Edge(collections.comment_parent, connectionMock, null, collections),
  comment_recipe: new Edge(collections.comment_recipe, connectionMock, null, collections),
};
connectionMock.newCollections = newCollections;
    
var associations = new Associations(connectionMock);
    
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
  
  
  it('getFetchPlan: check fetch plan query is built correctly', function(done){
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
    assert.equal(fetchPlan.where, 'in_authored_comment:1 in_authored_comment.out:1 out_comment_parent:1 out_comment_parent.in:1 out_comment_recipe:1');
    
    var fetchPlan2 = associations.getFetchPlan('comment', { joins: joins }, 2);
    assert.equal(fetchPlan2.where, 'in_authored_comment:1 in_authored_comment.out:2 out_comment_parent:1 out_comment_parent.in:2 out_comment_recipe:1');
    
    done();
  });
  
  
  it('expandResults: should replace foreign keys with cloned records', function(done){
    var resultset = [
        { id: '#5:0', name: 'Maria', out_edge: { out: '#5:0', in: '#4:0' } }
      ];
    
    var expandedResultset = [
        { id: '#5:0', name: 'Maria', out_edge: { out: { id: '#5:0', name: 'Maria', out_edge: { out: '#5:0', in: '#4:0' } },
         in: '#4:0' } }
      ];
    
    var transformed = associations.expandResults(resultset);
    assert(_.isEqual(transformed, expandedResultset), 'instead got: ' + util.inspect(transformed));
    
    done();
  });
  
});
