/**
 * Dependencies
 */

var Waterline = require('waterline');

module.exports = Waterline.Collection.extend({

  tableName: 'followsTable',
  identity: 'follows',
  connection: 'associations',

  attributes: {
    friend: {
      columnName: 'friend',
      type: 'string',
      foreignKey: true,
      references: 'friend',
      on: 'id',
      onKey: 'id',
      via: 'followee'
    },
    followee: {
      columnName: 'followee',
      type: 'string',
      foreignKey: true,
      references: 'friend',
      on: 'id',
      onKey: 'id',
      via: 'friend'
    }
  }

});
