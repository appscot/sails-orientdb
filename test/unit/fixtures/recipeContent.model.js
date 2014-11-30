'use strict';

module.exports = {

  identity : 'recipe_content',

  attributes : {
    name : {
      type : 'string',
      required : true
    },
    description : 'text',
    comments : {
      collection : 'comment',
      through : 'comment_recipe',
      via : 'recipeRef'
    }
  },
};
