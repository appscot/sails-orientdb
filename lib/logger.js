'use strict';

var util = require('util');

var RED     = '\x1b[31m';
var GREEN   = '\x1b[32m';
var YELLOW  = '\x1b[33m';
var RESET   = '\x1b[0m';


function getErrorMessage(e){
  var errorStrings = ['', ''];
  
  if(typeof e === 'undefined'){
    return errorStrings;
  }
  if(typeof e === 'string' || e instanceof String){
    errorStrings[0] = ' ' + e;
    return errorStrings;
  }
  if(e instanceof Error){
    errorStrings[0] = ' ' +  e.toString();
    if (e.stack){
      errorStrings[1] = '\nStack trace: ' + e.stack;
    }
    return errorStrings;
  }
  if(e && typeof e.toString !== 'undefined'){
    errorStrings[0] = ' ' + e.toString();
  }
  errorStrings[1] = '\nObject: ' + util.inspect(e);
  return errorStrings;
};


var logger = module.exports = function logger(namespace) {
  var debug = require('debug')(namespace);
  
  return {
    debug: function(message, e){
      var errorStrings = getErrorMessage(e);
      debug(' DEBUG  ' + message + errorStrings[0] + errorStrings[1]);
    },
    warn: function(message, e){
      var errorStrings = getErrorMessage(e);
      debug(YELLOW + ' WARN   ' + message + errorStrings[0] + RESET + errorStrings[1]);
    },
    error: function(message, e){
      var errorStrings = getErrorMessage(e);
      debug(RED + ' ERROR  ' + message + errorStrings[0] + RESET + errorStrings[1]);
    }
  };
};