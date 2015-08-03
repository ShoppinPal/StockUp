'use strict';

global.Promise = require('bluebird');
var loopback = require('loopback');
var boot = require('loopback-boot');

var path = require('path');
var fileName = path.basename(__filename, '.js'); // gives the filename without the .js extension
var log = require('debug')('server:'+fileName);

// HINT(s):
//   Getting the app object:
//     http://docs.strongloop.com/display/public/LB/Working+with+LoopBack+objects
var app = module.exports = loopback();

// Set up the /favicon.ico
app.use(loopback.favicon());

// request pre-processing middleware
app.use(loopback.compress());

// -- Add your pre-processing middleware here --
app.use(loopback.context());
app.use(loopback.token({ params: ['state'] })); //http://apidocs.strongloop.com/loopback/#loopback-token
// enable user access for remote methods
app.use(function setCurrentUser(req, res, next) {
  if (!req.accessToken) {
    return next();
  }
  app.models.UserModel.findById(req.accessToken.userId, function(err, user) {
    if (err) {
      return next(err);
    }
    if (!user) {
      return next(new Error('No user with this access token was found.'));
    }
    var loopbackContext = loopback.getCurrentContext();
    if (loopbackContext) {
      loopbackContext.set('currentUser', user);
    }
    next();
  });
});
// enable audit log
app.all('/api/*', function auditApiCalls(req, res, next) {
  if (req.accessToken) {
    log(req.method, req.originalUrl,
      //'\n\t', 'userId:', req.accessToken.id/*,
      '\n\t', 'token:', JSON.stringify(req.accessToken,null,0)
    );
  }
  else {
    log(req.method, req.originalUrl,
      '\n\t', 'token:', req.accessToken);
  }
  next();
});

// boot scripts mount components like REST API
boot(app, __dirname);

// -- Mount static files here--
// All static middleware should be registered at the end, as all requests
// passing the static middleware are hitting the file system
// Example:
var path = require('path');
//app.use(loopback.static(path.resolve(__dirname, '../client')));
app.use(loopback.static(path.join(__dirname, '../.tmp')));
app.use(loopback.static(path.join(__dirname, '../client/app')));

// Requests that get this far won't be handled
// by any middleware. Convert them into a 404 error
// that will be handled later down the chain.
app.use(loopback.urlNotFound());

// The ultimate error handler.
app.use(loopback.errorHandler());

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
