'use strict';

module.exports = {

  identity : 'authored_comment',

  attributes : {
    profileRef : {
      columnName : 'profileRef',
      type : 'string',
      foreignKey : true,
      references : 'profile',
      on : 'id',
      onKey : 'id',
      via : 'commentRef'
    },
    commentRef : {
      columnName : 'commentRef',
      type : 'string',
      foreignKey : true,
      references : 'comment',
      on : 'id',
      onKey : 'id',
      via : 'profileRef'
    },
  },
};
