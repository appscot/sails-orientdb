/**
 * Dependencies
 */

var Waterline = require('waterline');

module.exports = Waterline.Collection.extend({

  tableName : 'indexesTable',
  identity : 'indexes',
  connection : 'associations',

  attributes : {
    name : 'string',
    indexUnique : {
      type : 'string',
      unique : true
    },
    indexNotUnique : {
      columnName : 'indexDuplicates',
      type : 'string',
      index : true
    },
    
    props: {
      model: 'properties'
    }
  }

});
