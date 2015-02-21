"use strict";

var utils = require('../utils');

var Collection = module.exports = function Collection (definition, connection, databaseClass, collectionsByIdentity) {
  if(connection.config.options.databaseType === 'document' || 
      definition.orientdbClass === '' ||
      definition.orientdbClass === 'document' ||
      (definition.junctionTable && !utils.isJunctionTableThrough(definition) &&
        definition.orientdbClass !== 'V' && definition.orientdbClass !== 'E')){
    return new Collection.Document(definition, connection, databaseClass, collectionsByIdentity);
  }
  
  if(definition.orientdbClass === 'E' || 
      (utils.isJunctionTableThrough(definition) && definition.orientdbClass !== 'V')){
    return new Collection.Edge(definition, connection, databaseClass, collectionsByIdentity);
  }
  
  return new Collection.Vertex(definition, connection, databaseClass, collectionsByIdentity);
};

Collection.Document = require('./document');
Collection.Vertex = require('./vertex');
Collection.Edge = require('./edge');
