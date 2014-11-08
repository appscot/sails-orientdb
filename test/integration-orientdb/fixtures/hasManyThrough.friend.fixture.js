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
      via: 'followers',
      dominant: true
    },
    followers: {
      collection: 'friend',
      through: 'follows',
      via: 'followees',
    }
  }

});
