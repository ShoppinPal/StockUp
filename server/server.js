'use strict';

global.Promise = require('bluebird');
var loopback = require('loopback');
var boot = require('loopback-boot');

// HINT(s):
//   Getting the app object:
//     http://docs.strongloop.com/display/public/LB/Working+with+LoopBack+objects
var app = module.exports = loopback();

// boot scripts mount components like REST API
boot(app, __dirname);

app.start = function() {
  // start the web server
  return app.listen(function() {
    app.emit('started');
    console.log('Web server listening at: %s', app.get('url'));
  });
};

// start the server if `$ node server.js`
if (require.main === module) {
  app.start();
}

/**
 * Programmatically add the errorHandler because config.<env>.js is not supposed to be checked-in
 * and its too painful to format: `'remoting': { 'errorHandler': 'handler': function(...){...} }`
 * into a one liner for Jenkins configuration and sanity test it
 * ... anytime there are minor changes to the code :(
 *
 * References:
 *  > https://github.com/strongloop/loopback-faq-middleware#how-do-you-create-a-custom-error-message-for-all-errors
 *
 * @type {{handler: Function, disableStackTrace: boolean}}
 */
app.get('remoting').errorHandler = {
  handler: function(error, req, res, next) {
    /* Other options for namespace?
     > 'strong-remoting:rest-adapter'
     > 'server:middleware:errorHandler' */
    var log = require('debug')('server:rest:errorHandler');
    if (error instanceof Error) {
      log('Error in %s %s: errorName=%s errorMessage=%s \n errorStack=%s',
        req.method, req.url, error.name, error.message, error.stack);
    }
    else {
      log(req.method, req.originalUrl, res.statusCode, error);
    }
    next(); /* let the default error handler (RestAdapter.errorHandler) run next */
  },
  disableStackTrace: true
};
