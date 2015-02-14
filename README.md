[![npm version](https://badge.fury.io/js/waterline-orientdb.svg)](http://badge.fury.io/js/waterline-orientdb)
[![Build Status](https://travis-ci.org/appscot/waterline-orientdb.svg?branch=master)](https://travis-ci.org/appscot/waterline-orientdb)
[![Test Coverage](https://codeclimate.com/github/appscot/waterline-orientdb/badges/coverage.svg)](https://codeclimate.com/github/appscot/waterline-orientdb)
[![dependencies](https://david-dm.org/appscot/waterline-orientdb.svg)](https://david-dm.org/appscot/waterline-orientdb)
[![devDependencies](https://david-dm.org/appscot/waterline-orientdb/dev-status.svg)](https://david-dm.org/appscot/waterline-orientdb#info=devDependencies)
[![Gitter](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/appscot/waterline-orientdb?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

# waterline-orientdb

Waterline adapter for OrientDB. [Waterline](https://github.com/balderdashy/waterline) is a Node.js ORM used by Sails.js.

> **Warning**
>
> `waterline-orientdb` maps the logical `id` attribute to the required `@rid` physical-layer OrientDB Record ID.

#### Development Status
* Waterline-orientdb aims to work with Waterline v0.10.x and OrientDB v1.7.10 and later. While it may work with earlier versions, they are not currently supported, [pull requests are welcome](./CONTRIBUTING.md)!

* From the waterline [adapter interfaces](https://github.com/balderdashy/sails-docs/blob/master/contributing/adapter-specification.md) waterline-orientdb fully supports `Semantic`, `Queryable` and `Associations` interfaces.
Waterline-orientdb passes all integration tests from  [waterline-adapter-tests](https://github.com/balderdashy/waterline-adapter-tests).

* Many-to-many associations currently use a junction table instead of an edge and this will change at some point ([#29](https://github.com/appscot/waterline-orientdb/issues/29)).

## Installation

Install from NPM.

```bash
npm install waterline-orientdb --save
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
Many-to-Many Associations are handled by Waterline core, creating a join table holding foreign keys to the associated records. Waterline-orientdb does not change this behaviour for now but we will replace the join table by Edges in a future release ([#29](https://github.com/appscot/waterline-orientdb/issues/29)). Currently it's not deemed a priority.

###### Many-to-Many Through Associations
In Many-to-Many Through Association the join table is represented in OrientDB by Edges. Waterline-orientdb automatically creates the edges whenever an association is created. The Edge is named after the property tableName or identity in case tableName is missing.

#### sails-orientdb differences

###### Edge creation
The main difference between waterline-orientdb and [sails-orientdb](https://github.com/vjsrinath/sails-orientdb) is the way associations/edges are created. In `sails-orientdb` a special attribute named 'edge' is required while waterline-orientdb tries to adhere to waterline specficiation.

###### ID
Waterline-orientdb mimics sails-mongo adapter behaviour and maps the logical `id` attribute to the required `@rid` physical-layer OrientDB Record ID.

## Usage

This adapter adds the following methods:

###### `createEdge(from, to, options, callback)`
Creates edge between specified two model instances by ID in the form parameters `from` and `to`
  
usage: 
  ```javascript
  //Assume a model named "Post"
  Post.createEdge('#12:1','#13:1',{'@class':'Comments'},function(err, result){
  
  });
  ```
  
###### `deleteEdges(from, to, options, callback)`
Deletes edges between specified two model instances by ID in the form parameters `from` and `to`
  
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
  Post.getDB(function(db){
  	// db.query(...
  });
  ```

###### `getServer(connection, collection, cb)`
Returns a native Oriento connection
  
usage: 
  ```javascript
  Post.getServer(function(server){
  	// server.list()
  });
  ``` 

###### `removeCircularReferences(connection, collection, object, cb)`
Convenience method that replaces circular references with `id` when one is available, otherwise it replaces the object with string '[Circular]'
  
usage: 
  ```javascript
  //Assume a model named "Post"
  Post.removeCircularReferences(posts, function(result){
  	// JSON.stringify(result);  // it's safe to stringify result
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


## Waterline

[Waterline](https://github.com/balderdashy/waterline) is a new kind of storage and retrieval engine.

It provides a uniform API for accessing stuff from different kinds of databases, protocols, and 3rd party APIs. That means you write the same code to get users, whether they live in OrientDB, MySQL, LDAP, MongoDB, or Facebook.


## Contributions

We are always looking for the quality contributions! Please check the [CONTRIBUTING.md](./CONTRIBUTING.md) for the contribution guidelines.

Thanks so much to Srinath Janakiraman ([vjsrinath](http://github.com/vjsrinath)) who built the original `sails-orient` adapter.


## License

**[MIT](./LICENSE)**
&copy; 2015 [AppsCot](http://github.com/appscot)

