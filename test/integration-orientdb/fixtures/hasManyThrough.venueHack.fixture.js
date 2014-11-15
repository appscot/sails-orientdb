/**
 * Dependencies
 */

var Waterline = require('waterline');

module.exports = Waterline.Collection.extend({

  tableName: 'venueTable',
  identity: 'venue',
  connection: 'associations',

  attributes: {
    seats: 'integer',
    teamRef: {
      columnName: 'teamRef',
      type: 'string',
      foreignKey: true,
      references: 'team',
      on: 'id',
      onKey: 'id',
      via: 'stadiumRef'
    },
    stadiumRef: {
      columnName: 'stadiumRef',
      type: 'string',
      foreignKey: true,
      references: 'stadium',
      on: 'id',
      onKey: 'id',
      via: 'teamRef'
    }
  }

});
