"use strict";

var Collection = module.exports = function Collection (definition, connection, databaseClass, collectionsByIdentity) {
  if(connection.config.options.databaseType === 'document' || 
     definition.orientdbClass === '' ||
     definition.orientdbClass === 'document'){
    return new Collection.Document(definition, connection, databaseClass, collectionsByIdentity);
  }
  
  if(definition.orientdbClass === 'E' || 
      (definition.junctionTable && definition.orientdbClass !== 'V')){
    return new Collection.Edge(definition, connection, databaseClass, collectionsByIdentity);
  }
  
  return new Collection.Vertex(definition, connection, databaseClass, collectionsByIdentity);
};

Collection.Document = require('./document');
Collection.Vertex = require('./vertex');
Collection.Edge = require('./edge');
