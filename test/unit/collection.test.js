/**
 * Test dependencies
 */
var assert = require('assert'),
    Collection = require('../../lib/collection'),
    _ = require('lodash');


describe('collection class', function () {
  
  var defaultModel = {
    identity: 'default', 
    attributes: { name: 'string' },
    definition: { name: 'string' }
  };

  var collections = {};
  collections.defaultModel          = _.defaults({ }, defaultModel);
  collections.documentModel1        = _.defaults({ orientdbClass: '' }, defaultModel);
  collections.documentModel2        = _.defaults({ orientdbClass: 'document' }, defaultModel);
  collections.vertexModel           = _.defaults({ orientdbClass: 'V' }, defaultModel);
  collections.edgeModel             = _.defaults({ orientdbClass: 'E' }, defaultModel);
  collections.junctionModelThrough  = _.defaults({ junctionTable: true }, defaultModel);
  collections.junctionModelThroughD = _.defaults({ orientdbClass: '', junctionTable: true }, defaultModel);
  collections.junctionModelThroughV = _.defaults({ orientdbClass: 'V', junctionTable: true }, defaultModel);
  collections.junctionModel = _.defaults({
    identity : 'driver_taxis__taxi_drivers',
    tableName : 'driver_taxis__taxi_drivers',
    junctionTable : true
  }, defaultModel);
  collections.junctionModelE = _.defaults({
    orientdbClass: 'E',
    identity : 'driver_taxis__taxi_drivers',
    tableName : 'driver_taxis__taxi_drivers',
    junctionTable : true
  }, defaultModel);

  junctionTable: true,
  
  before(function(done){
    done();
  });

  describe('document database', function () {
    
    var documentConnectionMock = { config: { options: { databaseType: 'document' } } };

  	it('constructor: should instantiate a document regardless of orientdbClass value', function (done) {
  	  _.values(collections).forEach(function(collection){
  	    var doc = new Collection(collection, documentConnectionMock, null, null);
  	    assert(doc instanceof Collection.Document);
        assert(!(doc instanceof Collection.Vertex));
        assert(!(doc instanceof Collection.Edge));
  	  });
  		done();
	  });
	});
	
	describe('graph database', function () {
	  
	  var graphConnectionMock = { config: { options: { databaseType: 'graph' } } };
	  
	  it('constructor: should instantiate a document if orientdbClass is "" or "document"', function (done) {
      var doc = new Collection(collections.documentModel1, graphConnectionMock, null, null);
      assert(doc instanceof Collection.Document);
      assert(!(doc instanceof Collection.Vertex));
      assert(!(doc instanceof Collection.Edge));
      doc = new Collection(collections.documentModel2, graphConnectionMock, null, null);
      assert(doc instanceof Collection.Document);
      assert(!(doc instanceof Collection.Vertex));
      assert(!(doc instanceof Collection.Edge));
      doc = new Collection(collections.junctionModelThroughD, graphConnectionMock, null, null);
      assert(doc instanceof Collection.Document);
      assert(!(doc instanceof Collection.Vertex));
      assert(!(doc instanceof Collection.Edge));
      
      done();
    });
	   
  	it('constructor: should instantiate a vertex if orientdbClass is undefined or "V"', function (done) {
      var vertex = new Collection(collections.defaultModel, graphConnectionMock, null, null);
      assert(vertex instanceof Collection.Document);
      assert(vertex instanceof Collection.Vertex);
      vertex = new Collection(collections.vertexModel, graphConnectionMock, null, null);
      assert(vertex instanceof Collection.Vertex);
      vertex = new Collection(collections.junctionModelThroughV, graphConnectionMock, null, null);
      assert(vertex instanceof Collection.Vertex);
      
      done();
    });
    
    it('constructor: should instantiate an edge if orientdbClass is "E"', function (done) {
      var edge = new Collection(collections.edgeModel, graphConnectionMock, null, null);
      assert(edge instanceof Collection.Edge);
      edge = new Collection(collections.junctionModelE, graphConnectionMock, null, null);
      assert(edge instanceof Collection.Edge);      
      
      done();
    });
    
    it('constructor: should instantiate an edge if table is junction table for a many-to-many association', function (done) {
      var edge = new Collection(collections.junctionModel, graphConnectionMock, null, null);
      assert(edge instanceof Collection.Edge);
      done();
    });
    
    it('constructor: should instantiate an edge if table is junction table for a many-to-many through association', function (done) {
      var edge = new Collection(collections.junctionModelThrough, graphConnectionMock, null, null);
      assert(edge instanceof Collection.Edge);
      done();
    });
  
  });
	
	
});
