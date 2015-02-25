module.exports = {
  
  identity: 'image',

  attributes: {
    name: {
      type: 'string'
    },
    file: {
        type: 'json',
        isFile: true
    },
    footer: {
        type: 'string'
    },
    // author: {
        // model: 'author'
    // },
    area: {
        type: 'string'
    },
    isCrop: {
        type: 'boolean'
    },
    parent: {
        model: 'image'
    },
    crops: {
        collection: 'image',
        via: 'parent'
    }
  }
};