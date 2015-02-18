
module.exports = {
  
  identity: 'profile40',
  schema: false,

  attributes: {

    '*': '', // little hack to get all fields because no schema¬ 
    profiles: {
      collection: 'Subprofile',
      through: 'profileconnection',
      via: 'profile',
      dominant: true
    }

  }

};
