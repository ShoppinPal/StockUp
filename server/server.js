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
