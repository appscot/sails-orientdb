var assert = require('assert'),
    _ = require('lodash'),
    Oriento = require('oriento');

describe('Define related Operations', function() {

  describe('Indexes', function() {

    /////////////////////////////////////////////////////
    // TEST SETUP
    ////////////////////////////////////////////////////

    /////////////////////////////////////////////////////
    // TEST METHODS
    ////////////////////////////////////////////////////
    
    function testIndex(attributeName, indexType, cb){
      Associations.Indexes.getDB(function(db) {
        db.index.get('indexesTable.' + attributeName)
          .then(function(index) {
            assert.equal(index.name, 'indexesTable.' + attributeName);
            assert.equal(index.type, indexType);            
            cb();
          })
          .error(cb);
      });
    }

    it('should properly create unique index', function(done) {
      testIndex('indexUnique', 'UNIQUE', done);
    });
    
    it('should properly create not unique index', function(done) {
      testIndex('indexDuplicates', 'NOTUNIQUE', done);
    });
    
    it('should properly create fulltext index', function(done) {
      testIndex('indexFulltext', 'FULLTEXT', done);
    });
    
    it('should properly create dictionary index', function(done) {
      testIndex('indexDictionary', 'DICTIONARY', done);
    });
    
    it('should properly create unique hash index', function(done) {
      testIndex('indexUniqueHash', 'UNIQUE_HASH_INDEX', done);
    });
    
    it('should properly create not unique hash index', function(done) {
      testIndex('indexNotUniqueHash', 'NOTUNIQUE_HASH_INDEX', done);
    });
    
    it('should properly create fulltext hash index', function(done) {
      testIndex('indexFulltextHash', 'FULLTEXT_HASH_INDEX', done);
    });
    
    it('should properly create dictionary hash index', function(done) {
      testIndex('indexDictionaryHash', 'DICTIONARY_HASH_INDEX', done);
    });

    it('should properly create Link property in one-to-many association', function(done) {
      Associations.Indexes.native(function(klass) {
        klass.property.get('props')
          .then(function(property) {
            assert.equal(Oriento.types[property.type], 'Link');
            assert.equal(property.linkedClass, 'propertiesTable');
            done();
          })
          .error(done);
      });
    });
    

  });
}); 
