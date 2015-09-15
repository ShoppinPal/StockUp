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
      //res.locals.currentUser = user; // TODO: what merit could this hold?
      var loopbackContext = loopback.getCurrentContext();
      if (loopbackContext) {
        loopbackContext.set('currentUser', user);
      }

      // starts : info for injecting into logs
      loopbackContext.set('ip', req.ip ||
        req.connection.remoteAddress ||
        (req.socket && req.socket.remoteAddress) ||
        (req.socket.socket && req.socket.socket.remoteAddress)
      );
      /*console.log('set ip', req.ip ||
       req.connection.remoteAddress ||
       (req.socket && req.socket.remoteAddress) ||
       (req.socket.socket && req.socket.socket.remoteAddress)
       );*/
      if (loopbackContext.get('currentUser')) {
        loopbackContext.set('username', loopbackContext.get('currentUser').username);
        //console.log('set username', loopbackContext.get('currentUser').username);
      }
      if (req.accessToken) {
        loopbackContext.set('accessToken', req.accessToken.id);
        //console.log('set accessToken', req.accessToken.id);
      }
      // ends : info for injecting into logs

      next();
    });
  };
};
