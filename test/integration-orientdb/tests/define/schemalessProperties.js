var assert = require('assert'),
    _ = require('lodash'),
    Oriento = require('orientjs');

describe('Define related Operations', function() {

  describe('Property creation schemaless', function() {

    /////////////////////////////////////////////////////
    // TEST SETUP
    ////////////////////////////////////////////////////
    
    var klass;
    
    before(function(done) {
      Associations.Schemaless_properties.native(function(nativeClass) {
        klass = nativeClass;
        
        Associations.Schemaless_properties
          .create({
            schemaProp: 'schemaProp',
            customColumnProp: 'customColumnProp',
            schemaless: 'schemaless'
          }).exec(function(err, values){
            if(err) { return done(err); }
            
            Associations.Properties.create({
              stringProp: 'stringProp',
              textProp: 'textProp',
              propRequired: 'propRequired'
            }).exec(function(err, props){
              if(err) { return done(err); }

              assert.equal(props.textProp, 'textProp');
              done();
          });
        });
      });
    });


    /////////////////////////////////////////////////////
    // TEST METHODS
    ////////////////////////////////////////////////////
    
    it('should properly create string property from string', function(done) {
      klass.property.get('schemaProp')
        .then(function(property) {
          assert.equal(property.name, 'schemaProp');
          assert.equal(Oriento.types[property.type], 'String');
          done();
        })
        .error(done);
    });
    
    it('should properly create property with custom column name', function(done) {
      klass.property.get('customCol')
        .then(function(property) {
          assert.equal(property.name, 'customCol');
          assert.equal(Oriento.types[property.type], 'String');
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
    
    it('should return schemaless properties', function(done) {
      Associations.Schemaless_properties.findOne({ schemaProp: 'schemaProp' }).exec(function(err, record){
        if(err) { return done(err); }
        
        assert.equal(record.schemaProp, 'schemaProp');
        assert.equal(record.customColumnProp, 'customColumnProp');
        assert.equal(record.schemaless, 'schemaless');
        done();
      });
    });
    
    it('should not return schemaless properties with select query', function(done) {
      Associations.Schemaless_properties.findOne({ select: ['customColumnProp'], where: { schemaProp: 'schemaProp' } })
        .exec(function(err, record){
          if(err) { return done(err); }
          
          assert.equal(record.schemaProp, undefined);
          assert.equal(record.customColumnProp, 'customColumnProp');
          assert.equal(record.schemaless, undefined);
          done();
        });
    });
    
     it('schemaful regression test: should not return properties ommitted in projection', function(done) {
      Associations.Properties.findOne({ select: ['stringProp'], where: { stringProp: 'stringProp' } })
        .exec(function(err, record){
          if(err) { return done(err); }
          
          assert.equal(record.stringProp, 'stringProp');
          assert.equal(record.textProp, undefined);
          assert.equal(record.propRequired, undefined);
          done();
        });
    });
    
   
  });
}); 