/**
 * Dependencies
 */

var Waterline = require('waterline');

module.exports = Waterline.Collection.extend({

  tableName: 'friendTable',
  identity: 'friend',
  connection: 'associations',

  attributes: {
    name: 'string',
    followees: {
      collection: 'friend',
      through: 'follows',
      via: 'friend',
      dominant: true
    },
    followers: {
      collection: 'friend',
      through: 'follows',
      via: 'followee'
    },
    stadiums: {
      collection: 'stadium',
      through: 'owns',
      via: 'friendRef',
      dominant: true
    }
  }

});
