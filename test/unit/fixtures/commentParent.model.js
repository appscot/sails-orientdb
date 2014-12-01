'use strict';

module.exports = {

  identity : 'comment_parent',

  attributes : {
    childRef : {
      type : 'string',
      foreignKey : true,
      references : 'comment',
      on : 'id',
      onKey : 'id',
      via : 'parentRef'
    },
    parentRef : {
      type : 'string',
      foreignKey : true,
      references : 'comment',
      on : 'id',
      onKey : 'id',
      via : 'childRef'
    }
  }

};
