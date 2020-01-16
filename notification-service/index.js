'use strict';
const express = require('express');
const app = express();
const bodyParser = require("body-parser");
const path = require('path');
const cors = require('cors');
const fileName = path.basename(__filename, '.js'); // gives the filename without the .js extension
let utils = require('./utils/utils');
let initRedis = require('./utils/initRedis');
const logger = require('sp-json-logger')({fileName: + 'notification-service' + fileName});
let SSE = require('express-sse');
let authUsers = require('./middleware/authUsers');
const Sentry = require('@sentry/node');
var sentryDNS = process.env.STOCKUP_SENTRY_WEB_AND_NOTIFICATION_DNS;

Sentry.init({ dsn: sentryDNS });
// The request handler must be the first middleware on the app
app.use(Sentry.Handlers.requestHandler());
// The error handler must be before any other error middleware
app.use(Sentry.Handlers.errorHandler());
Sentry.captureMessage('Sentry initiated at Notification Server');

logger.debug({
    message: 'Sentry initiated at Notification Server',
    env: process.env.APP_HOST_NAME,
    sentryDNS: sentryDNS
});

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

// let sseMap = {};
let sseUsers = {};
let sseAPI = {};
/**
 * Publish will emit message on redis publsher connection
 * from where each running notification-service process will pick up the notification and send to client
 */
require('./publisher')(app);
app.get('/:userId/waitForResponse', (req, res) => {
    let userId = req.params.userId;

    if (!sseUsers[userId]) {
        let sse = new SSE(0);
        sse.init(req, res);
    
        sseUsers[userId] = {
            sse: sse,
            res: res,
            timeStamp: new Date()
        };

        logger.debug(`created a new sse object for userId: ${userId}`);
        sse.send({data: 'connected', eventType: 'EVENT_INIT'});
    }
    else {
        // reconnecting scenario
        sseUsers[userId].sse.init(req, res);
        sseUsers.timeStamp = new Date();
        logger.debug(`SSE exists for this userId, will move on for userId: ${userId}`);

        let sse = sseUsers[userId].sse;
        sse.send({data: 'connected', eventType: 'EVENT_INIT'});
    }
    
});

app.get('/:callId/waitForResponseAPI', (req, res) => {
    let callId = req.params.callId;

    if (!sseAPI[callId]) {
        let sse = new SSE(0);
        sse.init(req, res);
    
        sseAPI[callId] = {
            sse: sse,
            res: res,
            timeStamp: new Date()
        };

        logger.debug(`created a new sse object for callId: ${callId}`);
        sse.send({data: 'connected', eventType: 'EVENT_INIT'});
    }
    else {
        // reconnecting scenario
        sseAPI[callId].sse.init(req, res);
        logger.debug(`SSE exists for this callId, will move on for callId: ${callId}`);

        let sse = sseAPI[callId].sse;
        sse.send({data: 'connected', eventType: 'EVENT_INIT'});
    }
});

app.get('/sseMapCount', (req, res) => {
    res.send({
        sseAPI: Object.keys(sseAPI).length,
        sseUsers: Object.keys(sseUsers).length,
        // sseMap: Object.keys(sseMap).length
    });
});

// Once we are connected to redis, below event will be emitted;
app.on('redis-subscriber-connected', () => {
    app.redis.workerSubscriber.on('message', (channel, message) => {
        try{
            let payload = JSON.parse(message);
            let { eventType, data, messageFor, status } = payload;

            switch(messageFor) {
                case utils.constants.MESSAGE_FOR_CLIENT:
                let { userId } = payload;
                    utils.sendSSEOutput(sseUsers, userId, eventType, status, data, utils.constants.MESSAGE_FOR_CLIENT);
                break;

                case utils.constants.MESSAGE_FOR_API:
                    let { callId } = payload;
                    utils.sendSSEOutput(sseAPI, callId, eventType, status, data, utils.constants.MESSAGE_FOR_API);
                break;

                default:
                    logger.error({
                        error: new Error(`Unknown payload encountered`),
                        payload
                    });
                break;
            }
        }
        catch(error) {
            logger.error({
                error,
                message: 'Error while receiving redis subscription message'
            });
        }
    });
});

utils.cleanUsersIfInactive(sseUsers);
utils.cleanApiIfInactive(sseAPI);

app.listen(3001, function () {
    logger.debug({
        message: 'Notifier service listening on port 3001'
    });
    initRedis(app);
});

/**
 * Global error handler
 */
app.use((err, req, res) => {
    let statusCode = err.statusCode || 500;
    let errorMessage = err.message || 'Something unexpected happened';
    res.status(statusCode).send(errorMessage);
});

