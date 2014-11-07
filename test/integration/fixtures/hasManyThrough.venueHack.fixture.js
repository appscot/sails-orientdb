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
    team: {
      columnName: 'team',
      type: 'string',
      foreignKey: true,
      references: 'team',
      on: 'id',
      onKey: 'id',
      via: 'stadium'
    },
    stadium: {
      columnName: 'stadium',
      type: 'string',
      foreignKey: true,
      references: 'stadium',
      on: 'id',
      onKey: 'id',
      via: 'team'
    }
  }

});
