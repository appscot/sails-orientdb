
module.exports = {

  identity: 'post',
  
  attributes: {
    title: {
        type: 'string'
    },
    slug: {
        type: 'string'
    },
    editorialPriority: {
        type: 'string'
    },
    sectionPriority: {
        type: 'string'
    },
    html: {
        type: 'string'
    },
    editor_html: {
        type: 'string'
    },
    featureImage: {
        model: 'image'
    },
    area: {
        type: 'string'
    },
    excerpt: {
        type: 'string'
    },
    content: {
        type: 'string',
    },
    publicationDate: {
        type: 'datetime'
    },
    // categories:{
        // collection: 'category',
        // through: 'post_category',
        // via: 'post',
        // dominant: true
    // },
    // author:{
        // model:'author'
    // },
    // status:{
        // model:'postStatus'
    // },
    address: {
        type: 'string'
    },
    addressReference: {
        type: 'string'
    },
    latitude: {
        type: 'float'
    },
    longitude: {
        type: 'float'
    }
  }
};