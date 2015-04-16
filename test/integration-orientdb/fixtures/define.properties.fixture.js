
module.exports = {

  tableName : 'propertiesTable',
  identity : 'properties',
  connection : 'associations',

  attributes : {
    stringProp : {
      type : 'string'
    },
    textProp : 'text',
    jsonProp : 'json',
    arrayProp : 'array',
    floatProp : 'float',
    emailProp : 'email',
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

};
