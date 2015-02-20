"use strict";

var utils = require('../utils'),
    Document = require('./document');

/**
 * Manage A Vertex
 *
 * @param {Object}      definition
 * @param {Connection}  connection
 * @api public
 */
var Vertex = module.exports = utils.extend(Document, function() {
  Document.apply(this, arguments);
  
  // Set the orientdb super class ('document' / V / E) for this document
  this.superClass = 'V';
  
  // Set a class command that will be passed to Oriento ( 'undefined' / VERTEX / EDGE)
  this.classCommand = 'VERTEX';
});



/////////////////////////////////////////////////////////////////////////////////
// PUBLIC METHODS
/////////////////////////////////////////////////////////////////////////////////


//Deletes a collection from database
Vertex.prototype.drop = function (relations, cb) {
  var self = this;
  
  // If class doesn't exist don't delete records
  if(!self.databaseClass){ 
    return self.$super.prototype.drop.call(self, relations, cb);
  }
  
  self.connection.db.delete(self.classCommand).one()
    .then(function (/*count*/) {
      self.$super.prototype.drop.call(self, relations, cb);
    })
    .error(cb);
};

