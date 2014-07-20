![image_squidhome@2x.png](http://i.imgur.com/RIvu9.png)

# sails-orientdb

Provides easy access to `orientdb` from Sails.js & Waterline.

### The adapter in early development stages, pull requests are welcome
*The adapter automatically creates edges between model instances with the help of associations information available from Collection instance*

This module is a Waterline/Sails adapter, an early implementation of a rapidly-developing, tool-agnostic data standard.  Its goal is to provide a set of declarative interfaces, conventions, and best-practices for integrating with all sorts of data sources.  Not just databases-- external APIs, proprietary web services, or even hardware.

Strict adherence to an adapter specification enables the (re)use of built-in generic test suites, standardized documentation, reasonable expectations around the API for your users, and overall, a more pleasant development experience for everyone.


### Installation

To install this adapter, run:

```sh
$ npm install sails-orientdb
```




### Usage

This adapter exposes the following methods:

###### `find()`

+ **Status**
  + Completed

###### `create()`

+ **Status**
  + Completed

###### `update()`

+ **Status**
  + Completed

###### `destroy()`

+ **Status**
  + Completed

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

### Sample connection configuration in connection.js
If databas doesn't exist adapter will attempt to create a new one
```javascript

localOrientDB: {
        adapter: 'sails-orientdb',
        database: {
            name: 'dataBaseName'
        },
        username: "userName",
        password: "password"
        }

```



### Questions?

See [`FAQ.md`](./FAQ.md).



### More Resources

- [Stackoverflow](http://stackoverflow.com/questions/tagged/sails.js)
- [#sailsjs on Freenode](http://webchat.freenode.net/) (IRC channel)
- [Twitter](https://twitter.com/sailsjs)
- [Professional/enterprise](https://github.com/balderdashy/sails-docs/blob/master/FAQ.md#are-there-professional-support-options)
- [Tutorials](https://github.com/balderdashy/sails-docs/blob/master/FAQ.md#where-do-i-get-help)
- <a href="http://sailsjs.org" target="_blank" title="Node.js framework for building realtime APIs."><img src="https://github-camo.global.ssl.fastly.net/9e49073459ed4e0e2687b80eaf515d87b0da4a6b/687474703a2f2f62616c64657264617368792e6769746875622e696f2f7361696c732f696d616765732f6c6f676f2e706e67" width=60 alt="Sails.js logo (small)"/></a>


### License

**[MIT](./LICENSE)**
&copy; 2014 [vjsrinath](http://github.com/vjsrinath) & [thanks to]
[balderdashy](http://github.com/balderdashy), [Mike McNeil](http://michaelmcneil.com), [Balderdash](http://balderdash.co) & contributors

[Sails](http://sailsjs.org) is free and open-source under the [MIT License](http://sails.mit-license.org/).


[![githalytics.com alpha](https://cruel-carlota.pagodabox.com/8acf2fc2ca0aca8a3018e355ad776ed7 "githalytics.com")](http://githalytics.com/vjsrinath/sails-orientdb/README.md)


