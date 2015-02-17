/**
 * Dependencies
 */

var Waterline = require('waterline');

module.exports = Waterline.Collection.extend({

  identity: 'subprofile',
  connection: 'associations',
  schema: false,

  attributes: {
    //'*': '', // little hack to get all fields because no schema¬ 
    profiles: {
      collection: 'profile40',
      through: 'profileconnection',
      via: 'subprofile',
    }
  }

});
