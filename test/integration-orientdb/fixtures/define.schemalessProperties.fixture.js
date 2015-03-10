
module.exports = {

  tableName : 'schemalessPropertiesTable',
  identity : 'schemaless_properties',
  connection : 'associations',
  
  schema: false,

  attributes : {
    schemaProp : 'string',
    customColumnProp : {
      type: 'string',
      columnName: 'customCol'
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
