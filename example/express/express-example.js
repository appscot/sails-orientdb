/**
 * A simple example of how to use Waterline v0.10 with Express
 */

//////////////////////////////////////////////////////////////////
// Install dependencies:
// npm install waterline
// npm install waterline-orientdb
// npm install express
// npm install body-parser
// npm install method-override
//////////////////////////////////////////////////////////////////


var express = require('express'),
    app = express(),
    Waterline = require('waterline'),
    bodyParser = require('body-parser'),
    methodOverride = require('method-override');
    



// Instantiate a new instance of the ORM
var orm = new Waterline();


//////////////////////////////////////////////////////////////////
// WATERLINE CONFIG
//////////////////////////////////////////////////////////////////

// Require any waterline compatible adapters here
var orientAdapter = require('waterline-orientdb');


// Build A Config Object
var config = {

  // Setup Adapters
  // Creates named adapters that have have been required
  adapters: {
    'default': orientAdapter,
    orient: orientAdapter,
  },

  // Build Connections Config
  // Setup connections using the named adapter configs
  connections: {
    myLocalOrient: {
      adapter: 'orient',
      host: 'localhost',
      port: 2424,
      user: 'root',
      password: 'root',
      database: 'waterline-express'
    }
  },

  defaults: {
    migrate: 'alter'
  }

};


//////////////////////////////////////////////////////////////////
// WATERLINE MODELS
//////////////////////////////////////////////////////////////////

var User = Waterline.Collection.extend({

  identity: 'user',
  connection: 'myLocalOrient',

  attributes: {
    first_name: 'string',
    last_name: 'string'
  }
});

var Pet = Waterline.Collection.extend({

  identity: 'pet',
  connection: 'myLocalOrient',

  attributes: {
    name: 'string',
    breed: 'string'
  }
});


// Load the Models into the ORM
orm.loadCollection(User);
orm.loadCollection(Pet);



//////////////////////////////////////////////////////////////////
// EXPRESS SETUP
//////////////////////////////////////////////////////////////////


// Setup Express Application
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(methodOverride());

// Build Express Routes (CRUD routes for /users)

app.get('/users', function(req, res) {
  app.models.user.find().exec(function(err, models) {
    if(err) return res.json({ err: err }, 500);
    res.json(models);
  });
});

app.post('/users', function(req, res) {
  app.models.user.create(req.body, function(err, model) {
    if(err) return res.json({ err: err }, 500);
    res.json(model);
  });
});

app.get('/users/:id', function(req, res) {
  app.models.user.findOne({ id: req.params.id }, function(err, model) {
    if(err) return res.json({ err: err }, 500);
    res.json(model);
  });
});

app.delete('/users/:id', function(req, res) {
  app.models.user.destroy({ id: req.params.id }, function(err) {
    if(err) return res.json({ err: err }, 500);
    res.json({ status: 'ok' });
  });
});

app.put('/users/:id', function(req, res) {
  // Don't pass ID to update
  delete req.body.id;

  app.models.user.update({ id: req.params.id }, req.body, function(err, model) {
    if(err) return res.json({ err: err }, 500);
    res.json(model);
  });
});



//////////////////////////////////////////////////////////////////
// START WATERLINE
//////////////////////////////////////////////////////////////////

// Start Waterline passing adapters in
orm.initialize(config, function(err, models) {
  if(err) throw err;

  app.models = models.collections;
  app.connections = models.connections;

  // Start Server
  app.listen(3000);

  console.log();  
  console.log('To list saved users, visit http://localhost:3000/users');
  console.log();
  console.log('To retrieve a specific user, visit http://localhost:3000/users/<id>');
  console.log('Note: OrientDB ids need to be URI encoded, so #11:0 would be accessed at http://localhost:3000/users/%2311%3A0');
  console.log('You can add users with curl, e.g.: curl --data "first_name=john&last_name=doe" http://localhost:3000/users');
});

