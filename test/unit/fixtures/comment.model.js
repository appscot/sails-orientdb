'use strict';

module.exports = {

  identity : 'comment',

  attributes : {
    comment : 'string',
    author : {
      collection : 'profile',
      through : 'authored_comment',
      via : 'commentRef'
    },
    parent : {
      collection: 'comment',
      through: 'comment_parent',
      via: 'childRef',
      dominant: true
    },
    children : {
      collection: 'comment',
      through: 'comment_parent',
      via: 'parentRef'
    },
    recipe : {
      collection : 'recipe_content',
      through : 'comment_recipe',
      via : 'commentRef',
      dominant: true
    }
  }
};
