/**
 * Test dependencies
 */
var assert = require('assert'),
    utils = require('../../lib/utils');


describe('utils helper class', function() {
  
  var Shape;
  
  before(function(done){
    Shape = function(val1, val2) {
        this.x = val1;
        this.y = val2;
    };
    Shape.shapeProperty = 'shape';
    Shape.willBeOverriden = 'shape';
    Shape.prototype.protoShape = 'shape';
    Shape.prototype.protoOverride = 'shape';
    
    done();
  });
  
  describe('extend:', function() {
    
    it('should extend classes without source', function(done) {
      var Extended = utils.extend(Shape);
      var circle = new Extended(1, 2);
      assert(circle instanceof Extended);
      assert(circle instanceof Shape);
      assert.equal(circle.y, 2);
      done();
    });
    
    it('should extend classes from object with constructor', function(done) {
      var Extended = utils.extend(Shape, { constructor: function(val){ this.z = val; } });
      var circle = new Extended(1);
      assert(circle instanceof Extended);
      assert(circle instanceof Shape);
      assert.equal(circle.z, 1);
      done();
    });
    
    it('should extend classes from object', function(done) {
      var Circle = {
        willBeOverriden: 'circle',
        prototype: {
          foo: function(){ return 'foo'; },
          protoOverride: 'circle'
        }
      };
      Circle.willBeOverriden = 'circle';
      Circle.prototype.foo = function(){ return 'foo'; };
      Circle.prototype.protoOverride = 'circle';
      
      var Extended = utils.extend(Shape, Circle);
      assert.equal(Extended.shapeProperty, 'shape');
      assert.equal(Extended.willBeOverriden, 'circle');
      
      var circle = new Extended(1, 2);
      assert(circle instanceof Extended);
      assert(circle instanceof Shape);
      
      assert.equal(circle.y, 2);
      assert.equal(circle.foo(), 'foo');
      assert.equal(circle.protoOverride, 'circle');
      
      done();
    });
    

    it('should extend classes from function', function(done) {
      function Circle() {
        Shape.apply(this, arguments);
        this.z = arguments[0];
      }
      Circle.willBeOverriden = 'circle';
      Circle.prototype.foo = function(){ return 'foo'; };
      Circle.prototype.protoOverride = 'circle';
      
      var Extended = utils.extend(Shape, Circle);
      assert.equal(Extended.shapeProperty, 'shape');
      assert.equal(Extended.willBeOverriden, 'circle');
      
      var circle = new Extended(1, 2);
      assert(circle instanceof Extended);
      assert(circle instanceof Shape);
      
      assert.equal(circle.y, 2);
      assert.equal(circle.z, 1);
      assert.equal(circle.foo(), 'foo');
      assert.equal(circle.protoOverride, 'circle');
      
      done();
    });

  });
  
});
