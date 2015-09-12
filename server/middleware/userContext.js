'use strict';

var loopback = require('loopback');

/*var path = require('path');
var fileName = path.basename(__filename, '.js'); // gives the filename without the .js extension
var log = require('debug')('server:middleware:'+fileName);*/

module.exports = function() {
  // set current user to enable user access for remote methods
  return function userContext(req, res, next) {
    var app = req.app;
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
  };
};
