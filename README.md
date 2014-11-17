![Build Status](https://travis-ci.org/appscot/waterline-orientdb.svg?branch=master)

# waterline-orientdb

Waterline/Sails.js adapter for OrientDB.

> **Warning**
>
> `waterline-orientdb` maps the logical `id` attribute to the required `@rid` physical-layer OrientDB Record ID.
> In the current version of `waterline-orientdb`, you **should not** sort by `id`.


## Installation

Install from NPM.

```bash
$ npm install waterline-orientdb --save
```


## Waterline Configuration

#### Using with Waterline v0.10.x

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
  },
  
	defaults: {
    migrate: 'safe'
  }
}
```


## Overview

#### Models
Waterline-orientdb will represent most models in OrientDB as Vertices. The exception being Many-to-Many through join tables which are represented by Edges.

#### Associations
To learn how to create associations with Waterline/Sails.js check the Waterline Docs [Associations Page](https://github.com/balderdashy/waterline-docs/blob/master/associations.md). Below we go through how waterline-orientdb approaches each kind of associations.

###### One-to-One Associations
For One-to-One Associations waterline-orientdb creates a LINK ([OrientDB Types](http://www.orientechnologies.com/docs/last/orientdb.wiki/Types.html)) to associate records.

###### One-to-Many Associations
One-to-Many Associations are represented in OrientDB by a LINKSET.

###### Many-to-Many Associations
Many-to-Many Associations are handled by Waterline core, creating a join table holding foreign keys to the associated records. Waterline-orientdb does not change this behaviour for now but we may replace the join table by Edges in a future release. Currently it's not deemed a priority.

###### Many-to-Many Through Associations
In Many-to-Many Through Association the join table is represented in OrientDB by Edges. Waterline-orientdb automatically creates the edges whenever an association is created. The Edge is named after the property tableName or identity in case tableName is missing.

#### sails-orientdb differences

###### Edge creation
The main difference between waterline-orientdb and [sails-orientdb](https://github.com/vjsrinath/sails-orientdb) is the way associations/edges are created. In `sails-orientdb` a special attribute named 'edge' is required while waterline-orientdb tries to adhere to waterline specficiation.

###### ID
Waterline-orientdb mimics sails-mongo adapter behaviour and maps the logical `id` attribute to the required `@rid` physical-layer OrientDB Record ID.

#### Development Status

From the waterline [adapter interfaces](https://github.com/balderdashy/sails-docs/blob/master/contributing/adapter-specification.md) waterline-orientdb supports `Semantic` and `Associations` interfaces.
Currently the following integration tests from [waterline-adapter-tests](https://github.com/balderdashy/waterline-adapter-tests) are broken:
* Association Interface Has Many Association with Custom Primary Keys "before all" hook;
* Association Interface Has Many Association .find should return all the populated records when a skip clause is used;
* Association Interface Has Many Association .find should return payments using skip and limit;
* Association Interface n:m association :: .find().populate([WHERE]) should return taxis using skip and limit;
* Association Interface 1:1 Association .find() should return undefined for profile when the profile is a non-existent foreign key.

If you want to take a stab at these feel free to issue a Pull Request.


## Usage

This adapter adds the following methods:

###### `createEdge(@from, @to, @options, @callback)`
Creates edge between specified two model instances by ID in the form parameters "@from" and "@to"
  
usage: 
  ```javascript
 //Assume a model named "Post"
  Post.createEdge('#12:1','#13:1',{'@class':'Comments'},function(err, result){
  
  });
  ```
  
###### `deleteEdges(@from, @to, @options, @callback)`
Deletes edges between specified two model instances by ID in the form parameters "@from" and "@to"
  
usage: 
  ```javascript
 //Assume a model named "Post"
  Post.deleteEdges('#12:1','#13:1',null,function(err, result){
  
  });
  ```

###### `getDB(connection, collection, cb)`
Returns a native Oriento object
  
usage: 
  ```javascript
 //Assume a model named "Post"
  Post.getDB(function(err, result){
  });
  ```


#### Example Model definitions

```javascript
/**
 * Venue Model
 *
 * Join table between teams and associations
 */
var Waterline = require('waterline');

module.exports = Waterline.Collection.extend({

  tableName: 'venueTable',
  identity: 'venue',
  connection: 'associations',

  attributes: {
    seats: 'integer',
    teamRef: {
      columnName: 'teamRef',
      type: 'string',
      foreignKey: true,
      references: 'team',
      on: 'id',
      onKey: 'id',
      via: 'stadiumRef'
    },
    stadiumRef: {
      columnName: 'stadiumRef',
      type: 'string',
      foreignKey: true,
      references: 'stadium',
      on: 'id',
      onKey: 'id',
      via: 'teamRef'
    }
  }

});
```

#### Team Model to be associated with Stadium model
```javascript
/**
 * Team.js
 */
var Waterline = require('waterline');

module.exports = Waterline.Collection.extend({

  tableName: 'teamTable',
  identity: 'team',
  connection: 'associations',

  attributes: {
    name: 'string',
    mascot: 'string',
    stadiums: {
      collection: 'Stadium',
      through: 'venue',
      via: 'team',
      dominant: true
    }

});
```

#### Stadium Model to be associated with Team model
```javascript
/**
 * Stadium.js
 */
var Waterline = require('waterline');

module.exports = Waterline.Collection.extend({

  tableName: 'stadiumTable',
  identity: 'stadium',
  connection: 'associations',

  attributes: {
    name: 'string',
    teams: {
      collection: 'Team',
      through: 'venue',
      via: 'stadium'
    }
  }

});
```

An edge named **venueTable** will be created from Team to Stadium model instances whenever an instance of team model is saved with a 'stadiums' attribute.


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

