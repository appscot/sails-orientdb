/**
 * Dependencies
 */

var Waterline = require('waterline');

module.exports = Waterline.Collection.extend({

  tableName : 'propertiesTable',
  identity : 'properties',
  connection : 'associations',

  attributes : {
    stringProp : {
      type : 'string'
    },
    textProp : 'string',
    jsonProp : 'json',
    floatProp : 'float',
    propRequired : {
      type : 'string',
      required : true
    },
    modelProp : {
      model : 'indexes'
    },
    collectionProp : {
      collection : 'indexes',
      via : 'props'
    }
  }

});
