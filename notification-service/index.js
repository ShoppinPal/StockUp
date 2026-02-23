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

            // Validate messageFor field
            if (!messageFor) {
                logger.warn({
                    message: 'Notification missing messageFor field - IGNORING',
                    payload: payload,
                    eventType: eventType
                });
                return; // Ignore but don't crash
            }

            switch(messageFor) {
                case utils.constants.MESSAGE_FOR_CLIENT: {
                    let { userId } = payload;
                    if (!userId) {
                        logger.warn({
                            message: 'MESSAGE_FOR_CLIENT missing userId - IGNORING',
                            payload: payload
                        });
                        return;
                    }
                    utils.sendSSEOutput(sseUsers, userId, eventType, status, data, utils.constants.MESSAGE_FOR_CLIENT);
                    break;
                }

                case utils.constants.MESSAGE_FOR_API: {
                    let { callId } = payload;
                    if (!callId) {
                        logger.warn({
                            message: 'MESSAGE_FOR_API missing callId - IGNORING',
                            payload: payload
                        });
                        return;
                    }
                    utils.sendSSEOutput(sseAPI, callId, eventType, status, data, utils.constants.MESSAGE_FOR_API);
                    break;
                }

                default:
                    // Unknown messageFor - LOG but DON'T crash
                    logger.warn({
                        message: 'Unknown messageFor value - IGNORING',
                        messageFor: messageFor,
                        eventType: eventType,
                        payload: payload
                    });
                    // Don't throw error - just ignore
                    break;
            }
        }
        catch(error) {
            // JSON parse error or other error - LOG but DON'T crash
            logger.error({
                error,
                message: 'Error while receiving redis subscription message - IGNORING',
                rawMessage: message
            });
            // Don't throw - just log and continue
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

