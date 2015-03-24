
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
    indexDictionary : {
      type : 'string',
      index : 'dictionary'
    },
    
    indexUniqueHash : {
      type : 'string',
      index : 'unique_hash_index'
    },
    indexNotUniqueHash : {
      type : 'string',
      index : 'notunique_hash_index'
    },
    indexFulltextHash : {
      type : 'string',
      index : 'fulltext_hash_index'
    },
    indexDictionaryHash : {
      type : 'string',
      index : 'dictionary_hash_index'
    },
    
    props: {
      model: 'properties'
    },
    
    schemalessProps: {
      model: 'schemaless_properties'
    }
  }

};
