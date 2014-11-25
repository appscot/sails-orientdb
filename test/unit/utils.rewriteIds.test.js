/**
 * Test dependencies
 */
var assert = require('assert'),
    utils = require('../../lib/utils'),
    RID = require('oriento').RID;

describe('utils helper class', function() {

  describe('rewriteIds:', function() {

    it('single level result set', function(done) {
      var resultSet1 = { '@rid': new RID('#13:1'), property: 'value' };
      var result = utils.rewriteIds(resultSet1);
      assert.equal(result.id, '#13:1');
      assert.equal(result.property, 'value');
      assert(!result['@rid']);
      
      var resultSet2 = { '@rid': new RID('#13:1'), property: 'value', foreignKey: new RID('#13:2') };
      var result = utils.rewriteIds(resultSet2);
      assert.equal(result.id, '#13:1');
      assert.equal(result.property, 'value');
      assert.equal(typeof result.foreignKey, 'object');
      assert(result.foreignKey instanceof RID, 'instanceof RID');
      assert(!result['@rid']);
      
      var resultSet3 = [{ '@rid': new RID('#13:1'), property: 'value' }, { '@rid': new RID('#13:2')}];
      var result = utils.rewriteIds(resultSet3);
      assert.equal(result.length, 2);
      assert.equal(result[0].id, '#13:1');
      assert.equal(result[0].property, 'value');
      assert.equal(result[1].id, '#13:2');
      assert(!result[1]['@rid']);
      
      done();
    });


    it('with schema', function(done) {
      var mockSchema = {
        modelKey: {
          model: 'some_model',
          columnName: 'modelColumnName'
        },
        foreignKey: {
          type: 'string',
          foreignKey: true
        }
      };
      
      var resultSet1 = { '@rid': new RID('#13:1'), property: 'value', foreignKey: new RID('#13:2') };
      var result = utils.rewriteIds(resultSet1, mockSchema);
      assert.equal(result.id, '#13:1');
      assert.equal(result.property, 'value');
      assert.equal(typeof result.foreignKey, 'string');
      assert(result.foreignKey, '#13:2');
      assert(!result['@rid']);
      
      var resultSet2 = { '@rid': new RID('#13:1'), property: 'value', modelColumnName: new RID('#13:2') };
      var result = utils.rewriteIds(resultSet2, mockSchema);
      assert.equal(typeof result.modelColumnName, 'string');
      assert(result.modelColumnName, '#13:2');
      
      done();
    });


    it('multi level result set', function(done) {
      var resultSet1 = { '@rid': new RID('#13:1'), property: 'value', foreignKey: new RID('#13:2'), fetchedClass: { '@rid': new RID('#10:1')} };
      var result = utils.rewriteIds(resultSet1);
      assert.equal(result.id, '#13:1');
      assert.equal(result.property, 'value');
      assert.equal(typeof result.foreignKey, 'object');
      assert(result.foreignKey instanceof RID, 'instanceof RID');
      assert.equal(result.fetchedClass.id, '#10:1');
      assert(!result['@rid']);
      assert(!result.fetchedClass['@rid']);
      
      var resultSet2 = { '@rid': new RID('#13:1'), fetchedClass: { '@rid': new RID('#10:1'), nestedClass: { '@rid': new RID('#16:1') } } };
      var result = utils.rewriteIds(resultSet2);
      assert.equal(result.id, '#13:1');
      assert.equal(result.fetchedClass.id, '#10:1');
      assert.equal(result.fetchedClass.nestedClass.id, '#16:1');
      assert(!result['@rid']);
      assert(!result.fetchedClass['@rid']);
      assert(!result.fetchedClass.nestedClass['@rid']);
      
      done();
    });
    
    
    it('circular reference', function(done) {
      
      var resultSet = { '@rid': new RID('#13:1'), child: { '@rid': new RID('#10:1') } };
      resultSet.child.parent = resultSet; 
      var result = utils.rewriteIds(resultSet);
      assert.equal(result.id, '#13:1');
      assert.equal(result.child.id, '#10:1');
      assert.equal(result.child.parent.id, '#13:1');
      assert(!result['@rid']);
      assert(!result.child['@rid']);
      
      done();
    });

  });
});
