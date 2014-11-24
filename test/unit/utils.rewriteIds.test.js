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


    xit('multi level result set', function(done) {
      
      done();
    });

  });
});
