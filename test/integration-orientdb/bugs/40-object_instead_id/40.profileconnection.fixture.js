/**
 * Dependencies
 */

var Waterline = require('waterline');

module.exports = Waterline.Collection.extend({

  identity: 'profileconnection',
  connection: 'bugs',
  schema: false,

  attributes: {

    profileRef: {
      columnName: 'profileRef',
      type: 'string',
      foreignKey: true,
      references: 'profile40',
      on: 'id',
      onKey: 'id',
      via: 'subprofileRef'
    },
    subprofileRef: {
      columnName: 'subprofileRef',
      type: 'string',
      foreignKey: true,
      references: 'subprofile',
      on: 'id',
      onKey: 'id',
      via: 'profileRef'
    }
  }

});
