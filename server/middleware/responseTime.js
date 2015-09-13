'use strict';

var path = require('path');
var fileName = path.basename(__filename, '.js'); // gives the filename without the .js extension
var log = require('debug')('server:middleware:'+fileName);

module.exports = function() {
  return function responseTime(req, res, next) {
    // http://www.senchalabs.org/connect/responseTime.html
    var start = new Date;
    if (res._responseTime) {
      return next();
    }
    res._responseTime = true;

    // install a listener for when the response is finished
    res.on('finish', function() { // the request was handled, print the log entry
      var duration = new Date - start;
      log(req.method, req.originalUrl, res.statusCode, duration + 'ms',
        JSON.stringify({
          lbHttpMethod:req.method,
          lbUrl:req.originalUrl,
          lbStatusCode:res.statusCode,
          lbResponseTime:duration
        },null,0)
      );
    });

    // resume the routing pipeline,
    // let other middleware to actually handle the request
    next();
  };
};
