'use strict';

module.exports = {

  identity : 'profile',

  attributes : {
    displayName : 'string',
    comments : {
      collection : 'comment',
      through : 'authored_comment',
      via : 'profileRef',
      dominant : true
    }
  }
};
