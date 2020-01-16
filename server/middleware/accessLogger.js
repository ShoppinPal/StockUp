'use strict';

var path = require('path');
var fileName = path.basename(__filename, '.js'); // gives the filename without the .js extension
const logger = require('sp-json-logger')({fileName: 'server:boot:' + fileName});

module.exports = function () {
    return function accessLogger(req, res, next) {
        // enable audit log for API
        if (req.accessToken) {
            logger.debug({req: {method: req.method, originUrl: req.originalUrl, accessToken: req.accessToken}});
        }
        else {
            logger.debug({req: {method: req.method, originUrl: req.originalUrl}});
        }

        // http://www.senchalabs.org/connect/responseTime.html
        var start = new Date;
        if (res._responseTime) {
            return next();
        }
        res._responseTime = true;

        // install a listener for when the response is finished
        res.on('finish', function () { // the request was handled, print the log entry
            var duration = new Date - start;
            logger.debug({
                res: {
                    method: req.method,
                    originUrl: req.originalUrl,
                    lbHttpMethod: req.method,
                    lbUrl: req.originalUrl,
                    lbStatusCode: res.statusCode,
                    lbResponseTime: duration,
                    lbResponseTimeUnit: 'ms'
                }
            });
        });

        // resume the routing pipeline,
        // let other middleware to actually handle the request
        next();
    };
};
