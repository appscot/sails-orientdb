var assert = require('assert'),
    _ = require('lodash');

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
    
    it('should properly create not mandatory properties', function(done) {
      Associations.Indexes.getDB(function(db) {
        return db.class.get('indexesTable')
          .then(function(klass) {
            return klass.property.get('propRequired');
          })
          .then(function(property) {
            console.log('--- property', property);
            assert.equal(property.name, 'propRequired');
            assert.equal(property.mandatory, true);
            
            done();
          })
          .error(done);
      });
    });

  });
}); 