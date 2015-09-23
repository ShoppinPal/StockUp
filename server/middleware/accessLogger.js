'use strict';

var path = require('path');
var fileName = path.basename(__filename, '.js'); // gives the filename without the .js extension
var log = require('./../../common/lib/debug-extension')('server:middleware:'+fileName);

module.exports = function() {
  return function accessLogger(req, res, next) {
    // enable audit log for API
    if (req.accessToken) {
      log.debug('req', req.method, req.originalUrl,
        //'\n\t', 'userId:', req.accessToken.id,
        /*'\n\t',*/ 'token:', JSON.stringify(req.accessToken,null,0)
      );
    }
    else {
      log.debug('req', req.method, req.originalUrl);
    }

    // http://www.senchalabs.org/connect/responseTime.html
    var start = new Date;
    if (res._responseTime) {
      return next();
    }
    res._responseTime = true;

    // install a listener for when the response is finished
    res.on('finish', function() { // the request was handled, print the log entry
      var duration = new Date - start;
      log.debug('res', req.method, req.originalUrl,
        JSON.stringify({
          lbHttpMethod:req.method,
          lbUrl:req.originalUrl,
          lbStatusCode:res.statusCode,
          lbResponseTime:duration,
          lbResponseTimeUnit:'ms'
        },null,0)
      );
    });

    // resume the routing pipeline,
    // let other middleware to actually handle the request
    next();
  };
};
