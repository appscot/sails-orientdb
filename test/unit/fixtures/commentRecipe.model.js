'use strict';

module.exports = {

  identity : 'comment_recipe',

  attributes : {
    recipeRef : {
      type : 'string',
      foreignKey : true,
      references : 'recipe_content',
      on : 'id',
      onKey : 'id',
      via : 'commentRef'
    },
    commentRef : {
      type : 'string',
      foreignKey : true,
      references : 'comment',
      on : 'id',
      onKey : 'id',
      via : 'recipeRef'
    }
  }
};
