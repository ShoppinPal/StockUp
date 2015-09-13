'use strict';

var path = require('path');
var fileName = path.basename(__filename, '.js'); // gives the filename without the .js extension
var log = require('debug')('server:middleware:'+fileName);

module.exports = function() {
  return function sessionLogger(req, res, next) {
    // enable audit log for API
    if (req.accessToken) {
      log(req.method, req.originalUrl,
        //'\n\t', 'userId:', req.accessToken.id,
        /*'\n\t',*/ 'token:', JSON.stringify(req.accessToken,null,0)
      );
    }
    else {
      log(req.method, req.originalUrl);
    }
    next();
  };
};
