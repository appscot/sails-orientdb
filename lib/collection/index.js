"use strict";

var utils = require('../utils');

var Collection = module.exports = function Collection (definition, connection) {
  if(connection.config.databaseType === 'document' || definition.orientdbClass === 'document'){
    return new Collection.Document(definition, connection);
  }
  
  if(definition.orientdbClass === 'E' || 
      (utils.isJunctionTableThrough(definition) && definition.orientdbClass !== 'V')){
    return new Collection.Edge(definition, connection);
  }
  
  return new Collection.Vertex(definition, connection);
};

Collection.Document = require('./document');
Collection.Vertex = require('./vertex');
Collection.Edge = require('./edge');
