'use strict';

var SSE = require('express-sse');
var sseMap = {};
const path = require('path');
const fileName = path.basename(__filename, '.js'); // gives the filename without the .js extension
const logger = require('sp-json-logger')({fileName: 'common:utils:' + fileName});

function setupSSE(req,res, options) {
    res.connection.setTimeout(0);
    if (!sseMap[options.accessToken.userId]) {
        var sse = new SSE(0);
        sse.init(req, res);
        sseMap[options.accessToken.userId] = sse;
        logger.debug({
            options,
            message: 'Created sse for user',
            functionName: 'setup SSE'
        });
    }
    else {
        sseMap[options.accessToken.userId].init(req, res);
        logger.debug({
            options,
            message: 'SSE exists for this user, will move on',
            functionName: 'setup SSE'
        });
    }
}

function getSSE(userId) {
    return sseMap[userId];
}


module.exports = {
    sseMap,
    setupSSE,
    getSSE,
    PROCESSING: 'processing',
    CLOSED: 'closed'
};

