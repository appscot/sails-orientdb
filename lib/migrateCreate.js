/**
 * This module is essentially a workaround for the lack of a "safish" migration option
 * to create collections and properties by waterline core. To better understand the aim of this,
 * take a look at: https://github.com/balderdashy/waterline/issues/846
 */
"use strict";

/**
 * Module dependencies
 */
var _ = require('lodash'),
  async = require('async');



/**
 * Try and synchronize the underlying physical-layer schema
 * in safely manner by only adding new collections and new attributes
 * to work with our app's collections. (i.e. models)
 *
 * @param  {Function} cb
 */
module.exports = function(adapter, connection, collection, collectionSchema, cb) {
  var self = adapter;

  // Check that collection exists
  self.describe(connection, collection, function afterDescribe(err, attrs) {

    if(err) return cb(err);

    // if it doesn't go ahead and add it and get out
    if(!attrs) return self.define(connection, collection, collectionSchema, cb);
    
    // The collection we're working with
    var collectionID = collection;
    
    // Remove hasMany association keys before sending down to adapter
    var schema = _.clone(collectionSchema) || {};
    Object.keys(schema).forEach(function(key) {
      if(schema[key].type) return;
      delete schema[key];
    });
    
    // Iterate through each attribute in the new definition
    // Used for keeping track of previously undefined attributes
    // when updating the data stored at the physical layer.
    var newAttributes = _.reduce(schema, function checkAttribute(newAttributes, attribute, attrName) {
      if (!attrs[attrName]) {
        newAttributes[attrName] = attribute;
      }
      return newAttributes;
    }, {});
    
    // Add new attributes
    async.eachSeries(_.keys(newAttributes), function (attrName, next) {
      var attrDef = newAttributes[attrName];
      self.addAttribute(connection, collectionID, attrName, attrDef, next);
    }, cb);

  });
};