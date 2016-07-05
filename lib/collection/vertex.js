"use strict";

var utils = require('../utils'),
    _ = require('lodash'),
    Document = require('./document'),
    log = require('debug-logger')('sails-orientdb:vertex');

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


/**
 * Destroy Documents
 *
 * @param {Object} criteria
 * @param {Function} callback
 * @api public
 */
Vertex.prototype.destroy = function destroy(criteria, cb) {
  var self = this;
  cb = cb || _.noop;
  
  // TODO: should be in a transaction
  self.find(criteria, function(err, results){
    if(err){ return cb(err); }
    
    if(results.length === 0){ return cb(null, results); }
    
    var rids = _.map(results, 'id');
    log.debug('Destroy rids: ' + rids);
    
    self.connection.db.delete(self.classCommand)
      .where('@rid in [' + rids.join(',') + ']')
      .one()
      .then(function (count) {
        if(parseInt(count) !== rids.length){
          return cb(new Error('Deleted count [' + count + '] does not match rids length [' + rids.length +
            '], some vertices may not have been deleted'));
        }
        cb(null, results);
      })
      .error(cb);
  });
};



//Deletes a collection from database
Vertex.prototype.drop = function (relations, cb) {
  var self = this;
  
  // If class doesn't exist don't delete records
  if(!self.databaseClass){ 
    return self.$super.prototype.drop.call(self, relations, cb);
  }
  
  self.connection.db.delete(self.classCommand, self.tableName).one()
    .then(function (count) {
      log.debug('Drop [' + self.tableName + '], deleted records: ' + count);
      self.$super.prototype.drop.call(self, relations, cb);
    })
    .error(cb);
};

