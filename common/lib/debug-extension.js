'use strict';

var _ = require('lodash');
var loopback = require('loopback');

var LOG_LEVELS = [ 'fatal', 'error', 'warn', 'info', 'debug', 'trace' ];
var _loggerCache = {};

module.exports = mkLogger();

function mkLogger () {
  // Recursive magic to allow us to build up scope. Enables us to do things like,
  // var log = logger('models:discussion');
  // ... later ...
  // log('functionName').info('...');
  var scope = Array.prototype.slice.call(arguments).join(':');
  /*console.log('scope:',scope);
  if(!scope) {
    console.trace();
  }*/
  if (_loggerCache[scope]) return _loggerCache[scope];

  var ctx =  scope ? mkLogger.bind(null, scope) : mkLogger.bind(null);

  LOG_LEVELS.forEach(function (level) {
    ctx[level] = mkLoggerLevel(level, scope);
  });

  _loggerCache[scope] = ctx;
  return ctx;
}

function mkLoggerLevel(level, scope) {
  return function () {
    var params = arguments;
    //console.log('params', params);

    var logger;
    if (scope) {
      logger = require('debug')(scope);
      if (_.isObject(params[0])) {
        params[0].scope = scope; // TODO: when can this ever happen?
      } else {
        // convert to array
        params = Array.prototype.slice.call(arguments);

        var prefix = '';
        if (level) {
          prefix += level.toUpperCase();
        }

        var loopbackContext = loopback.getCurrentContext();
        if (loopbackContext) {
          // prep the all important identifier for wading through logs
          var identifier = loopbackContext.get('ip');
          if (loopbackContext.get('username')){
            identifier += '-' + loopbackContext.get('username');
          }
          else {
            identifier += '-X';
          }
          if (loopbackContext.get('accessToken')){
            // don't want prefixes to be too long, want logs to be human-readable
            identifier += '-' + loopbackContext.get('accessToken').slice(-6);
          }
          else {
            identifier += '-X';
          }
          // TODO: is there any merit yet, in adding individual requestIds too?
          //identifier += '-' + loopbackContext.get('requestId')

          // prefix it to every log statement
          prefix = prefix + ' ' + identifier;
        }

        // place a stacktrace at the end, if you are feeling verbose
        //var stack = new Error().stack;
        //params.push(stack);

        if (_.isString(params[0]) && prefix.length>0) {
          params[0] = prefix + ' ' + params[0];
        }
        else {
          params.unshift(prefix);
        }
      }

      //return logger.apply(null, params);
    }
    else {
      //TODO: [@doublemarked commented]:
      //        the alternative is to have mkLogger throw an error
      //        if there is no scope provided
      console.trace('WHEN IS SCOPE EVER NOT PRESENT?');
      logger = require('debug');
    }
    return logger.apply(logger, params);
    /*else {
      return console.log.apply(null,params);
    }*/
  };
}