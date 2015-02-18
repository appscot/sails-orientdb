module.exports = {
  
  identity: 'image',

  attributes: {
    file: {
        type: 'json',
        isFile: true,
        required: true
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