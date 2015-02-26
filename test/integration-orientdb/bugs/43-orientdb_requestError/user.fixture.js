module.exports = {
  tableName : 'User',
  identity : 'dbuser',
  schema : true,
  attributes : {
    id : {
      type : 'string',
      primaryKey : true,
      columnName : '@rid'
    },
    username : {
      type : 'string',
      // required : true,
      unique : true
    },
    password : {
      type : 'string',
      // required : false
    },
    token : {
      type : 'string'
    },
    follows : {
      collection : 'dbuser',
      via : 'followed',
      dominant : true
    },
    followed : {
      collection : 'dbuser',
      via : 'follows'
    }
  }
};
