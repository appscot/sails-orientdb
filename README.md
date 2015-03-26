[![npm version](https://badge.fury.io/js/sails-orientdb.svg)](http://badge.fury.io/js/sails-orientdb)
[![Build Status](https://travis-ci.org/appscot/sails-orientdb.svg?branch=master)](https://travis-ci.org/appscot/sails-orientdb)
[![Test Coverage](https://codeclimate.com/github/appscot/sails-orientdb/badges/coverage.svg)](https://codeclimate.com/github/appscot/sails-orientdb)
[![dependencies](https://david-dm.org/appscot/sails-orientdb.svg)](https://david-dm.org/appscot/sails-orientdb)
[![Gitter](https://img.shields.io/badge/gitter-join%20chat%20%E2%86%92-brightgreen.svg)](https://gitter.im/appscot/sails-orientdb?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

# sails-orientdb

Waterline adapter for OrientDB. [Waterline](https://github.com/balderdashy/waterline) is an adapter-based ORM for Node.js with support for mysql, mongo, postgres, redis, orientdb and more.

> **Warning**
>
> `sails-orientdb` maps the logical `id` attribute to the required `@rid` physical-layer OrientDB Record ID.
>
>
> Migrations
>
> We don't recommend using `migrate: 'alter'` as it has the nasty effect of deleting the data of all edges on a graphDB, leaving only data on the vertexes. 
> Either use `'safe'` and migrate manually or use `'drop'` to completely reset the data and collections. In production
> always use `'safe'`. We are currently pushing for a new kind of migration strategy named `'create'`, check [waterline issue #846](https://github.com/balderdashy/waterline/issues/846).


Sails-orientdb aims to work with Waterline v0.10.x and [OrientDB](http://www.orientechnologies.com/orientdb/) v1.7.10 and later. While it may work with earlier versions, they are not currently supported, [pull requests are welcome](./CONTRIBUTING.md)!

From the waterline [adapter interfaces](https://github.com/balderdashy/sails-docs/blob/master/contributing/adapter-specification.md) sails-orientdb supports `Semantic`, `Queryable`, `Associations` and `Migratable` interfaces. Sails-orientdb complies with waterline API and it's used in the same way as other waterline/sails adapters.

Sails-orientdb connects to OrientDB using [Oriento](https://github.com/codemix/oriento) (OrientDB's official driver).


## Table of Contents
1. [Installation](#installation)
2. [Configuration](#configuration)
3. [Overview](#overview)
4. [Usage](#usage)
5. [Testing](#testing)
6. [Issues or Suggestions](#issues-or-suggestions)
7. [Contributions](#contributions)
8. [About Waterline](#about-waterline)
9. [License](#license)


## Installation

Install from NPM.

```bash
npm install sails-orientdb --save
```


## Configuration

Sails-orientdb can be used with SailsJS, for more information on how to use Waterline in your Sails App view the [Sails Docs](http://sailsjs.org/#!/documentation/concepts/ORM).
An example configuration for SailsJS is provided [here](./example/sails-config).

For examples on how to use Waterline/sails-orientdb with frameworks such as Express look in the [example](./example/express) folder.

### Waterline v0.10.x configuration

#### Basic Example

```javascript
var orientAdapter = require('sails-orientdb');
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
    // The first time you run sails-orientdb `migrate` needs to be set to 'drop' or 'alter' in order to create the DB schema
    // More about this on: http://sailsjs.org/#!/documentation/concepts/ORM/model-settings.html
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
      
        // DB/Oriento Options
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
        
        // migrations
        //
        // Drop tables without deleting edges/vertexes hence not ensuring graph consistency
        // Will speed up drop operations. Only works with migration: 'alter' or 'drop'
        unsafeDrop : false,
        
        // other
        //
        // Turn parameterized queries on
        parameterized : true
      }
    }
```
The values stated above represent the default values. For an up to date comprehensive list check [adapter.js](https://github.com/appscot/sails-orientdb/blob/master/lib/adapter.js#L87).

## Overview

### Models
In a graph db Sails-orientdb will represent most models in OrientDB as vertexes, the exception being Many-to-Many join tables which are represented by Edges. If using a document db, all models will be represented by documents.

### Associations
To learn how to create associations with Waterline/Sails.js check the Waterline Docs [Associations Page](https://github.com/balderdashy/waterline-docs/blob/master/associations.md). Below we go through how sails-orientdb represent each kind of association in an OrientDB database.

#### One-to-One Associations
For One-to-One Associations sails-orientdb creates a LINK ([OrientDB Types](http://www.orientechnologies.com/docs/last/orientdb.wiki/Types.html)) to associate records.

#### One-to-Many Associations
One-to-Many Associations are also represented by LINKs in OrientDB.

#### Many-to-Many Associations
In many-to-many associations sails-orientdb will connect vertexes using edges, hence edges act as join tables.

##### Custom edge names (optional)
Usually Waterline will create rather long names for join tables (e.g. driver_taxis__taxi_drivers) which are little meaningful from the perspective of a graphDB. Sails-orientdb allows you to change the name of the edge by adding a property `joinTableNames` to the dominant collection. Example:
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
In this example the join table name **driver_taxis__taxi_drivers** gets converted to **drives**. Complete example of the fixture can be found [here](https://github.com/appscot/sails-orientdb/tree/master/test/integration-orientdb/fixtures/manyToMany.driverHack.fixture.js).

#### Many-to-Many Through Associations
In a [Many-to-Many Through Association](https://github.com/balderdashy/waterline-docs/blob/master/associations.md#many-to-many-through-associations) ([more info](https://github.com/balderdashy/waterline/issues/705#issuecomment-60945411)) the join table is represented in OrientDB by Edges. Sails-orientdb automatically creates the edges whenever an association is created. The Edge is named after the property tableName (or identity in case tableName is missing).

#### Populate queries (joins)
Sails-orientdb implements its own custom join function so when the user runs `.populate(some_collection)` it will send a single `SELECT` query with a [fetchplan](http://www.orientechnologies.com/docs/last/orientdb.wiki/Fetching-Strategies.html) to OrientDB. This way join operations remain fast and performant by leveraging OrientDB's graphDB features.

## Usage

### Documentation
For a comprehensive reference on how to use waterline please check [waterline-docs](https://github.com/balderdashy/waterline-docs#waterline-v010-documentation). Below we describe how `waterine-orientdb` approaches and adds to the waterline core experience.

### Models
`sails-orientdb` uses the standard [waterline model definition](https://github.com/balderdashy/waterline-docs/blob/master/models.md) and extends it in order to accommodate OrientDB features.

#### orientdbClass

It's possible to force the class of a model by adding the property `orientdbClass` to the definition. Generally this is not required as `sails-orientdb` can determine which is the best class to use, so it should only be used in special cases. Possible values:
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
  // Assume a model named "Post"
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
  // Assume a model named "Post"
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
  // Assume a model named "Post"
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
  // Assume a model named "Post"
  Post.runFunction('foo', 'arg1').from('OUser').limit(1).one()
    .then(function(res) {
      console.log(res.foo);  // res.foo contains the result of the function
  	});
  ``` 
  
#### .createEdge (from, to, options, callback)
Creates edge between specified two model instances by ID in the form parameters `from` and `to`

usage: 
  ```javascript
  // Assume a model named "Post"
  Post.createEdge('#12:1', '#13:1', { '@class':'Comments' }, function(err, result){
    console.log('Edges deleted', result);
  });
  ```
> Note: when using many-to-many or many-to-many through associations edges will automatically be created. This method is for manual edge manipulation only and it's not required for maintaining associations.
  
#### .deleteEdges (from, to, options, callback)
Deletes edges between specified two model instances by ID in the form parameters `from` and `to`

usage: 
  ```javascript
  // Assume a model named "Post"
  Post.deleteEdges('#12:1', '#13:1', null, function(err, result){
    console.log('Edge created', result);
  });
  ```
> Note: when using many-to-many or many-to-many through associations edges will automatically be deleted when using the conventional waterline methods. This method is for manual edge manipulation only and it's not required for maintaining associations.

#### .removeCircularReferences (object)
Convenience method that replaces circular references with `id` when one is available, otherwise it replaces the object with string '[Circular]'.
  
usage: 
  ```javascript
  //Assume a model named "Post"
  var result = Post.removeCircularReferences(posts);
  console.log(JSON.stringify(result));  // it's safe to stringify result
  ```


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

## Issues or Suggestions
We are always trying to improve `sails-orientdb` either by fixing issues or adding new features. If you experienced an issue or have a suggestion feel free to [raise a new issue](https://github.com/appscot/sails-orientdb/issues/new), preferably by following the [guidelines](./CONTRIBUTING.md#how-to-report-bugs).


## Contributions

We are always looking for the quality contributions! Please check the [CONTRIBUTING.md](./CONTRIBUTING.md) for the contribution guidelines.

Thanks so much to Srinath Janakiraman ([vjsrinath](http://github.com/vjsrinath)) who built the `sails-orientdb` adapter, from which `sails-orientdb` was originally forked.


## About Waterline

[Waterline](https://github.com/balderdashy/waterline) is a new kind of storage and retrieval engine.

It provides a uniform API for accessing stuff from different kinds of databases, protocols, and 3rd party APIs. That means you write the same code to get and store things like users, whether they live in OrientDB, Redis, mySQL, LDAP, MongoDB, or Postgres.

Waterline strives to inherit the best parts of ORMs like ActiveRecord, Hibernate, and Mongoose, but with a fresh perspective and emphasis on modularity, testability, and consistency across adapters.


## License

**[MIT](./LICENSE)**
&copy; 2015 [AppsCot](http://github.com/appscot)

