'use strict';

var loopback = require('loopback');

var path = require('path');
var fileName = path.basename(__filename, '.js'); // gives the filename without the .js extension
var log = require('./../../common/lib/debug-extension')('server:middleware:'+fileName);

module.exports = function() {
  // set current user to enable user access for remote methods
  return function userContext(req, res, next) {

    var loopbackContext = loopback.getCurrentContext();
    if (loopbackContext) {
      // starts : info for injecting into logs
      loopbackContext.set('ip', req.ip ||
        req.connection.remoteAddress ||
        (req.socket && req.socket.remoteAddress) ||
        (req.socket.socket && req.socket.socket.remoteAddress)
      );

      if (!req.accessToken) {
        return next();
      }
      else {
        // info for injecting into logs
        loopbackContext.set('accessToken', req.accessToken.id);

        var app = req.app;
        app.models.UserModel.findById(req.accessToken.userId, function(err, user) {
          if (err) {
            return next(err);
          }
          if (!user) {
            return next(new Error('No user with this access token was found.'));
          }

          // TODO: what merit could this hold?
          //res.locals.currentUser = user;

          // info for use by remote methods
          loopbackContext.set('currentUser', user);

          // info for injecting into logs
          loopbackContext.set('username', user.username);

          next();
        });
      }
    }
    else {
      next();
    }
  };
};
