
module.exports = {

  identity : 'counter',
  connection : 'associations',
  
  orientdbClass : 'document',
  
  autoPK: false,
  associationFinders: false,

  attributes : {
    name: {
      type: 'string',
      primaryKey: true,
      required: true,
      unique: true
    },
    value: {
      type: 'integer',
      defaultsTo: 0
    }
  }

};
