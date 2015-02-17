/**
 * Dependencies
 */

var Waterline = require('waterline');

module.exports = Waterline.Collection.extend({
  
  identity: 'profile40',
  connection: 'associations',
  schema: false,

  attributes: {

    //'*': '', // little hack to get all fields because no schema¬ 
    profiles: {
      collection: 'Subprofile',
      through: 'profileconnection',
      via: 'profile',
      dominant: true
    }

  }

});
