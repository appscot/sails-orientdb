[![npm version](https://badge.fury.io/js/waterline-orientdb.svg)](http://badge.fury.io/js/waterline-orientdb)
[![Build Status](https://travis-ci.org/appscot/waterline-orientdb.svg?branch=master)](https://travis-ci.org/appscot/waterline-orientdb)
[![Test Coverage](https://codeclimate.com/github/appscot/waterline-orientdb/badges/coverage.svg)](https://codeclimate.com/github/appscot/waterline-orientdb)
[![dependencies](https://david-dm.org/appscot/waterline-orientdb.svg)](https://david-dm.org/appscot/waterline-orientdb)
[![Gitter](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/appscot/waterline-orientdb?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

# waterline-orientdb

Waterline adapter for OrientDB. [Waterline](https://github.com/balderdashy/waterline) is a Node.js ORM used by Sails.js.

> **Warning**
>
> `waterline-orientdb` maps the logical `id` attribute to the required `@rid` physical-layer OrientDB Record ID.
>
>
> Migrations
>
> We don't recommend using `migrate: 'alter'` as it has the nasty effect of deleting the data of all edges on a graphDB, leaving only data on the vertexes. 
> Either use `'safe'` and migrate manually or use `'drop'` to completely reset the data and collections. In production
> always use `'safe'`. We are currently pushing for a new kind of migration strategy named `'create'`, check [waterline issue #846](https://github.com/balderdashy/waterline/issues/846).


Waterline-orientdb aims to work with Waterline v0.10.x and OrientDB v1.7.10 and later. While it may work with earlier versions, they are not currently supported, [pull requests are welcome](
ONTRIBUTING.md)!

From the waterline [adapter interfaces](https://github.com/balderdashy/sails-docs/blob/master/contributing/adapter-specification.md) waterline-orientdb supports `Semantic`, `Queryable`, `Associations` and `Migratable` interfaces.

Waterline-orientb connects to OrientDB using [Oriento](codemix/oriento) (OrientDB's official driver).


## Table of Contents
1. [Installation](#installation)
2. [Examples](#example)
3. [Overview](#overview)
4. [Usage](#usage)
5. [Testing](#testing)
6. [Contributions](#contributions)
7. [About Waterline](#about-waterline)
8. [License](#license)


## Installation

Install from NPM.

```bash
npm install waterline-orientdb --save
```


## Examples

Waterline-orientdb can be used with SailsJS, for more information on how to use Waterline in your Sails App view the [Sails Docs](http://sailsjs.org/#!/documentation/concepts/ORM).
An example configuration is provided [here](./example/sails-config).

For examples of how to use Waterline/waterline-orientdb with frameworks such as Express look in the [Example](./example/express) folder.

### Waterline v0.10.x configuration

#### Basic Example

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

#### Connection advanced config example
```javascript
    myLocalOrient: {
      adapter: 'orient',
      host: 'localhost',
      port: 2424,
      user: 'root',
      password: 'root',
      database: 'waterline',
      
      // Additional options
      options: {
      
        // DB Options
        //
        // database type: graph | document
        databaseType : 'graph',
        //
        // storage type: memory | plocal
        storage : 'plocal',
        
        // Useful in REST APIs
        //
        // If `id` is URI encoded, decode it with `decodeURIComponent()` (useful when `id` comes from an URL)
        decodeURIComponent : true,
        //
        // Replaces circular references with `id` after populate operations (useful when results will be JSONfied)
        removeCircularReferences : false,
        
        // other
        //
        // Turn parameterized queries on
        parameterized : true
      }
    }
```
The values stated above represent the default values. For an up to date comprehensive list check [adapter.js](https://github.com/appscot/waterline-orientdb/blob/master/lib/adapter.js#L87).

## Overview

### Models
In a graph db Waterline-orientdb will represent most models in OrientDB as vertexes, the exception being Many-to-Many join tables which are represented by Edges. If using a document db, all models will be represented by documents.

### Associations
To learn how to create associations with Waterline/Sails.js check the Waterline Docs [Associations Page](https://github.com/balderdashy/waterline-docs/blob/master/associations.md). Below we go through how waterline-orientdb approaches each kind of association.

#### One-to-One Associations
For One-to-One Associations waterline-orientdb creates a LINK ([OrientDB Types](http://www.orientechnologies.com/docs/last/orientdb.wiki/Types.html)) to associate records.

#### One-to-Many Associations
One-to-Many Associations are also represented by LINKs in OrientDB.

#### Many-to-Many Associations
In many-to-many associations waterline-orientdb will connect vertexes using edges, hence edges act as join tables. Usually Waterline will create rather long names for join tables (e.g. driver_taxis__taxi_drivers) which are little meaningful from the perspective of a graphDB. Waterline-orientdb allows you to change the name of the edge by adding a property `joinTableNames` to the dominant collection. Example:
```javascript
{
  identity: 'driver',
  joinTableNames: {
    taxis: 'drives'
  },
  
  attributes: {
    name: 'string',
    taxis: {
      collection: 'taxi',
      via: 'drivers',
      dominant: true
    }
  }
}
```
In this example the join table name **driver_taxis__taxi_drivers** get converted to **drives**. Complete example of the fixture can be found [here](https://github.com/appscot/waterline-orientdb/tree/master/test/integration-orientdb/fixtures/manyToMany.driverHack.fixture.js).

#### Many-to-Many Through Associations
In a [Many-to-Many Through Association](https://github.com/balderdashy/waterline-docs/blob/master/associations.md#many-to-many-through-associations) ([more info](https://github.com/balderdashy/waterline/issues/705#issuecomment-60945411)) the join table is represented in OrientDB by Edges. Waterline-orientdb automatically creates the edges whenever an association is created. The Edge is named after the property tableName (or identity in case tableName is missing).

#### Populate queries (joins)
Waterline-orientdb implements its own custom join function so when the user runs `.populate(some_collection)` it will send a single `SELECT` query with a [fetchplan](http://www.orientechnologies.com/docs/last/orientdb.wiki/Fetching-Strategies.html) to OrientDB. This way join operations remain fast and performant by leveraging OrientDB's graphDB features.

### sails-orientdb differences

#### Edge creation
The main difference between waterline-orientdb and [sails-orientdb](https://github.com/vjsrinath/sails-orientdb) is the way associations/edges are created. In `sails-orientdb` a special attribute named 'edge' is required while waterline-orientdb tries to adhere to waterline specification.

#### ID
Waterline-orientdb mimics sails-mongo adapter behaviour and maps the logical `id` attribute to the required `@rid` physical-layer OrientDB Record ID. Because of this it's not necessary to declare an `id` attribute on your model definitions.

## Usage

### Models

`waterline-orientdb` uses the standard [waterline model definition](https://github.com/balderdashy/waterline-docs/blob/master/models.md) and extends it in order to accommodate OrientDB features.

#### orientdbClass

It's possible to force the class of a model by adding the property `orientdbClass` to the definition. Generally this is not required as `waterline-orientdb` can determine which is the best class to use, so it should only be used in special cases. Possible values:
* `undefined` - the default and recommended option. The appropriate class will be determined for the model;
* `""` or `"document"` - class will be the default OrientDB document class;
* `"V"` - class will be Vertex;
* `"E"` - class will be Edge.

Example:
```javascript
{
  identity : 'post',
  orientdbClass : 'V'

  attributes : {
    name : 'string'
  }
}
```

Note, when using a document database (through `config.options.databaseType`), `orientdbClass` class will be ignored and all classes will be documents.


### Methods

This adapter extends waterline with the following methods:

#### .createEdge (from, to, options, callback)
Creates edge between specified two model instances by ID in the form parameters `from` and `to`
  
usage: 
  ```javascript
  //Assume a model named "Post"
  Post.createEdge('#12:1', '#13:1', { '@class':'Comments' }, function(err, result){
    console.log('Edges deleted', result);
  });
  ```
  
#### .deleteEdges (from, to, options, callback)
Deletes edges between specified two model instances by ID in the form parameters `from` and `to`
  
usage: 
  ```javascript
  //Assume a model named "Post"
  Post.deleteEdges('#12:1', '#13:1', null, function(err, result){
    console.log('Edge created', result);
  });
  ```

#### .query (query [, options], cb)
Runs a SQL query against the database using Oriento's query method. Will attempt to convert @rid's into ids.
  
usage: 
  ```javascript
  // Assume a model named "Friend"
  Friend.query("SELECT FROM friendTable WHERE name='friend query'", function(err, retrievedUsers){
  	console.log(retrievedUsers);
  });
  
  // Using params
  Friend.query("SELECT FROM friendTable WHERE name=:name", {
    params: {
      name: 'friend query'
    }
  }, function(err, retrievedUsers){
  	console.log(retrievedUsers);
  });
  ```

#### .native ()
Returns a native Oriento class
  
usage: 
  ```javascript
  //Assume a model named "Post"
  Post.native()
  	.property.list()
    .then(function (properties) {
      console.log('The class has the following properties:', properties);
    });
  ```

#### .getDB ()
Returns a native Oriento database object
  
usage: 
  ```javascript
  //Assume a model named "Post"
  Post.getDB()
    .class.list()
    .then(function (classes) {
      console.log('There are ' + classes.length + ' classes in the db:', classes);
    });
  ```

#### .getServer ()
Returns a native Oriento connection
  
usage: 
  ```javascript
  Post.getServer()
    .list()
    .then(function (dbs) {
      console.log('There are ' + dbs.length + ' databases on the server.');
    });
  ``` 
  
#### .runFunction (functionName [, ...])
Returns a prepared Oriento statement with query and params to run an OrientDB function.
  
usage: 
  ```javascript
  Post.runFunction('foo', 'arg1').from('OUser').limit(1).one()
    .then(function(res) {
      console.log(res.foo);  // res.foo contains the result of the function
  	});
  ``` 

#### .removeCircularReferences (object)
Convenience method that replaces circular references with `id` when one is available, otherwise it replaces the object with string '[Circular]'.
  
usage: 
  ```javascript
  //Assume a model named "Post"
  var result = Post.removeCircularReferences(posts);
  console.log(JSON.stringify(result));  // it's safe to stringify result
  ```

### Documentation
Above we've described how `waterine-orientdb` approaches and adds to the waterline core experience. For a comprehensive reference on how to use waterline please check [waterline-docs](https://github.com/balderdashy/waterline-docs#waterline-v010-documentation).

### Examples

For a vast set of examples on how to set up models take a look at [waterline-adapter-tests fixtures](https://github.com/balderdashy/waterline-adapter-tests/tree/master/interfaces/associations/support/fixtures), all of those are working examples and frequently tested. 

The only case poorly covered is how to set up a Many-to-many *through* association as it is [not yet officially supported](https://github.com/balderdashy/waterline/issues/705). Below is an example of a Many-to-many through association that works in OrientDB.

#### Many-to-many through example

##### Venue model which will join (via edge) teams to stadiums
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

##### Team Model to be associated with Stadium model
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

##### Stadium Model to be associated with Team model
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


## Testing
Test are written with mocha. Integration tests are handled by the [waterline-adapter-tests](https://github.com/balderdashy/waterline-adapter-tests) project, which tests adapter methods against the latest Waterline API.

To run tests:
```shell
npm test
```


## Contributions

We are always looking for the quality contributions! Please check the [CONTRIBUTING.md](./CONTRIBUTING.md) for the contribution guidelines.

Thanks so much to Srinath Janakiraman ([vjsrinath](http://github.com/vjsrinath)) who built the `sails-orientdb` adapter, from which `waterline-orientdb` was forked.


## About Waterline

[Waterline](https://github.com/balderdashy/waterline) is a new kind of storage and retrieval engine.

It provides a uniform API for accessing stuff from different kinds of databases, protocols, and 3rd party APIs. That means you write the same code to get users, whether they live in OrientDB, MySQL, LDAP, MongoDB, or Facebook.


## License

**[MIT](./LICENSE)**
&copy; 2015 [AppsCot](http://github.com/appscot)

