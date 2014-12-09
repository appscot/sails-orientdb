/**
 * Dependencies
 */

var Waterline = require('waterline');

module.exports = Waterline.Collection.extend({

  tableName: 'ownsTable',
  identity: 'owns',
  connection: 'associations',

  attributes: {
    friendRef: {
      columnName: 'friendRef',
      type: 'string',
      foreignKey: true,
      references: 'friend',
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
      via: 'friendRef'
    }
  }

});
