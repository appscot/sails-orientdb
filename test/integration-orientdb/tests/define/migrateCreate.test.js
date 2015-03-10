var assert = require('assert'),
    _ = require('lodash');

var self = this,
    fixtures,
    config,
    enabledConfig;

describe('Migration', function() {
  before(function (done) {
    
    config = {
      database : 'test_migrate_create',
      options : {
        createCollectionsAtStartup : false
      }
    };
    
    enabledConfig = {
      database : 'test_migrate_create',
      options : {
        createCollectionsAtStartup : true
      }
    };
  
    fixtures = {
      MigrantFixture : require('../../fixtures/migrateCreate.migrant.fixture')
    };

    CREATE_TEST_WATERLINE(self, config, fixtures, done);
  });
  after(function (done) {
    DELETE_TEST_WATERLINE('test_migrate_create', done);
  });


  describe('createCollectionsAtStartup: false', function() {
    
    /////////////////////////////////////////////////////
    // TEST SETUP
    ////////////////////////////////////////////////////
    
    after(function (done) {
      self.waterline.teardown(done);
    });
    
    /////////////////////////////////////////////////////
    // TEST METHODS
    ////////////////////////////////////////////////////
    
    it('should have the proper migrate setting when bootstrapping', function() {
      assert.equal(self.collections.Migrant.migrate, 'safe');
    });
    
    it('should not have tables', function(done) {
      self.collections.Migrant.describe(function(err, schema) {
        assert(!err);
        assert(!schema);
        done();
      });
    });
  });
  
  
  describe('createCollectionsAtStartup: true', function() {
    
    /////////////////////////////////////////////////////
    // TEST SETUP
    ////////////////////////////////////////////////////
    
    before(function (done) {
      CREATE_TEST_WATERLINE(self, enabledConfig, fixtures, function(err){
        if(err) { return done(err); }
        self.collections.Migrant.create({ name: 'charlie' }, done);
      });
    });
    after(function (done) {
      self.waterline.teardown(done);
    });
    
    /////////////////////////////////////////////////////
    // TEST METHODS
    ////////////////////////////////////////////////////
    
    it('should have tables', function(done) {
      self.collections.Migrant.describe(function(err, schema) {
        assert(!err);
        assert(schema);
        assert(schema.name);
        assert(!schema.age);
        done();
      });
    });
    
    it('should have created record', function(done) {
      self.collections.Migrant.findOne({ name: 'charlie' }, function(err, mig) {
        assert(!err);
        assert.equal(mig.name, 'charlie');
        done();
      });
    });
  });
  
  
  describe('createCollectionsAtStartup: true, new property', function() {
    
    /////////////////////////////////////////////////////
    // TEST SETUP
    ////////////////////////////////////////////////////
    
    var newPropertyFixtures = {
      MigrantFixture: _.cloneDeep(require('../../fixtures/migrateCreate.migrant.fixture'))
    };
    newPropertyFixtures.MigrantFixture.attributes.age = 'int';
    
    before(function (done) {
      CREATE_TEST_WATERLINE(self, enabledConfig, newPropertyFixtures, function(err){
        if(err) { return done(err); }
        self.collections.Migrant.create({ name: 'chaplin', age: 5 }, done);
      });
    });
    
    /////////////////////////////////////////////////////
    // TEST METHODS
    ////////////////////////////////////////////////////
    
    it('should have previous records', function(done) {
      self.collections.Migrant.findOne({ name: 'charlie' }, function(err, mig) {
        assert(!err);
        assert.equal(mig.name, 'charlie');
        done();
      });
    });
    
    it('should have new property age', function(done) {
      self.collections.Migrant.describe(function(err, schema) {
        assert(!err);
        assert(schema);
        assert(schema.name);
        assert(schema.age);
        done();
      });
    });
    
    it('should have created record with age', function(done) {
      self.collections.Migrant.findOne({ name: 'chaplin' }, function(err, mig) {
        assert(!err);
        assert.equal(mig.name, 'chaplin');
        assert.equal(mig.age, 5);
        done();
      });
    });
  });
  
});
