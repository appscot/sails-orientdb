'use strict';

var util = require('util');
var vmDebug = require('debug');
exports = module.exports = logger;

var RED     = '\x1b[31m';
var GREEN   = '\x1b[32m';
var YELLOW  = '\x1b[33m';
var BLUE    = '\x1b[34m';
var RESET   = '\x1b[0m';

exports.colors = {
  debug: BLUE,
  info: GREEN,
  warn: YELLOW,
  error: RED,
  reset: RESET
};

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
      errorStrings[1] = '\n  stack trace: ' + e.stack;
    }
    return errorStrings;
  }
  if(e && typeof e.toString !== 'undefined'){
    errorStrings[0] = ' ' + e.toString();
  }
  errorStrings[1] = '\n  object: ' + util.inspect(e);
  return errorStrings;
};

function getFormattedMessage(message, e){
  var errorStrings = getErrorMessage(e);
  return message + errorStrings[0] + errorStrings[1];
}


function logger(namespace) {
  var log = vmDebug(namespace);
  var debug = vmDebug(namespace + ':debug');
  
  var loggerObj = {
    logger: log,
    debugLogger: debug,
    isDebugEnabled: function(){
      return debug.enabled;
    }
  };
  
  if(vmDebug.useColors){
    var colors = exports.colors;
    loggerObj.debug = function(message, e){
      debug(colors.debug +     'DEBUG  ' + colors.reset + getFormattedMessage(message, e));
    };
    loggerObj.info = function(message, e){
      log(colors.info +  '      INFO   ' + colors.reset + getFormattedMessage(message, e));
    };
    loggerObj.warn = function(message, e){
      log(colors.warn +  '      WARN   ' + colors.reset + getFormattedMessage(message, e));
    };
    loggerObj.error = function(message, e){
      log(colors.error + '      ERROR  ' + colors.reset + getFormattedMessage(message, e));
    };
  }
  else {
    loggerObj.debug = function(message, e){
      debug(    'DEBUG  ' + getFormattedMessage(message, e));
    };
    loggerObj.info = function(message, e){
      log('      INFO   ' + getFormattedMessage(message, e));
    };
    loggerObj.warn = function(message, e){
      log('      WARN   ' + getFormattedMessage(message, e));
    };
    loggerObj.error = function(message, e){
      log('      ERROR  ' + getFormattedMessage(message, e));
    };
  }
  
  return loggerObj;
};
