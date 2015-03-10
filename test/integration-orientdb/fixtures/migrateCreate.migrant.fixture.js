
module.exports = {

  tableName: 'migrantTable',
  identity: 'migrant',
  connection: 'associations',
  migrate: 'safe',

  attributes: {
    name: 'string'
  }
};