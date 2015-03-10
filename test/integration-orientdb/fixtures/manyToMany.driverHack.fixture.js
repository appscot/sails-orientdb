
module.exports = {

  tableName: 'driverTable',
  identity: 'driver',
  connection: 'associations',
  joinTableNames: {
    taxis: 'drives'
  },

  // migrate: 'drop', 
  attributes: {
    name: 'string',
    taxis: {
      collection: 'taxi',
      via: 'drivers',
      //joinTableName: 'drives',
      dominant: true
    },

    toJSON: function() {
      var obj = this.toObject();
      delete obj.name;
      return obj;
    }
  }
};
