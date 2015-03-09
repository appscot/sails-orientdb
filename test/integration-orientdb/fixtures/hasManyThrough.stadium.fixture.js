
module.exports = {

  tableName: 'stadiumTable',
  identity: 'stadium',
  connection: 'associations',

  attributes: {
    name: 'string',
    teams: {
      collection: 'Team',
      through: 'venue',
      via: 'stadium'
    },
    owners: {
      collection: 'friend',
      through: 'owns',
      via: 'stadiumRef'
    },
    sponsor: {
      model: 'friend'
    }
  }

};
