![image_squidhome@2x.png](http://i.imgur.com/RIvu9.png)

![Build Status](https://travis-ci.org/appscot/waterline-orientdb.svg?branch=master)

# waterline-orientdb

Waterline/Sails.js adapter for Orientdb.

> **Warning**
>
> `waterline-orientdb` maps the logical `id` attribute to the required `@rid` physical-layer OrientDB Record ID.
> In the current version of `waterline-orientdb`, you **should not** sort by `id`.


## Installation

Install from NPM.

```bash
$ npm install appscot/waterline-orientdb --save
```

## Waterline Configuration

### Using with Waterline v0.10.x

```javascript
var orientAdapter = require('waterline-orientdb');
var config = {
  adapters: {
    'default': orientAdapter,
    orient: orientAdapter,
  },
  
  connections: {
    myLocalOrient: {
      adapter: 'orient',
      host: 'localhost',
      port: 2424,
      user: 'root',
      password: 'root',
      database: 'waterline'
    }
  }
}
```

## Development Status

From the waterline [adapter interfaces](https://github.com/balderdashy/sails-docs/blob/master/contributing/adapter-specification.md) waterline-orientdb supports `Semantic` and `Associations` interfaces.
Currently the following integration tests from [waterline-adapter-tests](https://github.com/balderdashy/waterline-adapter-tests) are broken:
* Association Interface Has Many Association with Custom Primary Keys "before all" hook;
* Association Interface Has Many Association .find should return all the populated records when a skip clause is used;
* Association Interface Has Many Association .find should return payments using skip and limit;
* Association Interface n:m association :: .find().populate([WHERE]) should return taxis using skip and limit;
* Association Interface 1:1 Association .find() should return undefined for profile when the profile is a non-existent foreign key.


## Usage

This adapter adds the following methods:

###### `createEdge(@from,@to,@options,@callback)`
Creates edge between specified two model instances by ID in the form parameters "@from" and "@to"
+ **Status**
  + Completed
  
usage: 
  ```javascript
 //Assume a model named "Post"
  Post.createEdge('#12:1','#13:1',{'@class':'Comments'},function(err, result){
  
  });
  ```
  
###### `deleteEdges(@from,@to,@options,@callback)`
Deletes edges between specified two model instances by ID in the form parameters "@from" and "@to"
+ **Status**
  + Completed
  
usage: 
  ```javascript
 //Assume a model named "Post"
  Post.deleteEdges('#12:1','#13:1',null,function(err, result){
  
  });
  ```

### Example Model definitions

### Development
```javascript
/**
 * User Model
 *
 * The User model represents the schema of authentication data
 */
module.exports = {

    // Enforce model schema in the case of schemaless databases
    schema: true,
    tableName: 'User',
    attributes: {
        id: {
            type: 'string',
            primaryKey: true,
            columnName: '@rid'
        },
        username: {
            type: 'string',
            unique: true
        },
        email: {
            type: 'email',
            unique: true
        },        
        profile: {
            collection: 'Profile',
            via: 'user',
            edge: 'userProfile'
        }
    }
};
```

#### Profile Model to be associated with User model
```javascript
/**
 * Profile.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/#!documentation/models
 */

module.exports = {
    tableName: 'Profile',
    attributes: {
        id: {
            type: 'string',
            primaryKey: true,
            columnName: '@rid'
        },
        user: {
            model: "User",
            required: true
        },
        familyName: {
            type: 'string'
        },
        givenName: {
            type: 'string'
        },
        profilePic: {
            type: 'string'
        }
    }
};
```

An edge names **userProfile** would be created between user and profile model instances whenever an instance of profile model is saved with **user** attribute having id of **user** instance.

Check out **Connections** in the Sails docs, or see the `config/connections.js` file in a new Sails project for information on setting up adapters.


### Questions?

See [`FAQ.md`](./FAQ.md).


### More Resources

- [Stackoverflow](http://stackoverflow.com/questions/tagged/sails.js)
- [#sailsjs on Freenode](http://webchat.freenode.net/) (IRC channel)
- [Tutorials](https://github.com/balderdashy/sails-docs/blob/master/FAQ.md#where-do-i-get-help)
- <a href="http://sailsjs.org" target="_blank" title="Node.js framework for building realtime APIs."><img src="https://github-camo.global.ssl.fastly.net/9e49073459ed4e0e2687b80eaf515d87b0da4a6b/687474703a2f2f62616c64657264617368792e6769746875622e696f2f7361696c732f696d616765732f6c6f676f2e706e67" width=60 alt="Sails.js logo (small)"/></a>

## Waterline

[Waterline](https://github.com/balderdashy/waterline) is a new kind of storage and retrieval engine.

It provides a uniform API for accessing stuff from different kinds of databases, protocols, and 3rd party APIs. That means you write the same code to get users, whether they live in MySQL, LDAP, MongoDB, or Facebook.

## Contributors

Thanks so much to Srinath Janakiraman ([vjsrinath](http://github.com/vjsrinath)) who built the original `sails-orient` adapter.

## License

**[MIT](./LICENSE)**
&copy; 2014 [AppsCot](http://github.com/appscot)

[Sails](http://sailsjs.org) is free and open-source under the [MIT License](http://sails.mit-license.org/).
