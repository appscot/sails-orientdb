
module.exports = {

  identity: 'subprofile',
  schema: false,

  attributes: {
    '*': '', // little hack to get all fields because no schema¬ 
    profiles: {
      collection: 'profile40',
      through: 'profileconnection',
      via: 'subprofile',
    }
  }

};
