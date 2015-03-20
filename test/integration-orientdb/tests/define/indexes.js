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

    it('should properly create unique index', function(done) {
      Associations.Indexes.getDB(function(db) {
        db.index.get('indexesTable.indexUnique')
          .then(function(index) {
            assert.equal(index.name, 'indexesTable.indexUnique');
            assert.equal(index.type, 'UNIQUE');            
            
            done();
          })
          .error(done);
      });
    });
    
    it('should properly create not unique index', function(done) {
      Associations.Indexes.getDB(function(db) {
        db.index.get('indexesTable.indexDuplicates')
          .then(function(index) {
            assert.equal(index.name, 'indexesTable.indexDuplicates');
            assert.equal(index.type, 'NOTUNIQUE');            
            
            done();
          })
          .error(done);
      });
    });
    
    it('should properly create fulltext index', function(done) {
      Associations.Indexes.getDB(function(db) {
        db.index.get('indexesTable.indexFulltext')
          .then(function(index) {
            assert.equal(index.name, 'indexesTable.indexFulltext');
            assert.equal(index.type, 'FULLTEXT');            
            
            done();
          })
          .error(done);
      });
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
