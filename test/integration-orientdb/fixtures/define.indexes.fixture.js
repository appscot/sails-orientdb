
module.exports = {

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
    indexFulltext : {
      columnName : 'indexFulltext',
      type : 'string',
      index : 'fulltext'
    },
    
    props: {
      model: 'properties'
    },
    
    schemalessProps: {
      model: 'schemaless_properties'
    }
  }

};
