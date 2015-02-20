var assert = require('assert'),
    _ = require('lodash'),
    Oriento = require('oriento');

describe('Define related Operations', function() {

  describe('Property creation', function() {

    /////////////////////////////////////////////////////
    // TEST SETUP
    ////////////////////////////////////////////////////
    
    var klass;
    
    before(function(done) {
      Associations.Properties.getDB(function(db) {
        db.class.get('propertiesTable')
          .then(function(myClass) {
            klass = myClass;
            done();
          })
          .catch(done);
      });
    });


    /////////////////////////////////////////////////////
    // TEST METHODS
    ////////////////////////////////////////////////////
    
    it('should properly create mandatory property', function(done) {
      klass.property.get('propRequired')
        .then(function(property) {
          assert.equal(property.name, 'propRequired');
          assert.equal(property.mandatory, true);
          done();
        })
        .error(done);
    });
    
    it('should properly create string property from string', function(done) {
      klass.property.get('stringProp')
        .then(function(property) {
          assert.equal(property.name, 'stringProp');
          assert.equal(Oriento.types[property.type], 'String');
          done();
        })
        .error(done);
    });
    
    it('should properly create string property from text', function(done) {
      klass.property.get('textProp')
        .then(function(property) {
          assert.equal(Oriento.types[property.type], 'String');
          done();
        })
        .error(done);
    });
    
    it('should properly create float property from float', function(done) {
      klass.property.get('floatProp')
        .then(function(property) {
          assert.equal(Oriento.types[property.type], 'Float');
          done();
        })
        .error(done);
    });
    
    it('should properly create Embedded property from json', function(done) {
      klass.property.get('jsonProp')
        .then(function(property) {
          assert.equal(Oriento.types[property.type], 'Embedded');
          done();
        })
        .error(done);
    });
    
    it('should properly create Link property from model', function(done) {
      klass.property.get('modelProp')
        .then(function(property) {
          assert.equal(Oriento.types[property.type], 'Link');
          assert.equal(property.linkedClass, 'indexesTable');
          done();
        })
        .error(done);
    });
    
    // Not sure this can happen seen it's only required a Links exists on the associated table
    // it('should properly create LinkSet property from collection', function(done) {
      // klass.property.get('collectionProp')
        // .then(function(property) {
          // assert.equal(Oriento.types[property.type], 'LinkSet');
          // assert.equal(property.linkedClass, 'indexesTable');
          // done();
        // })
        // .error(done);
    // });
    
   
  });
}); 