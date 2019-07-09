'use strict';
const logger = require('sp-json-logger')();
const MESSAGE_FOR_CLIENT = 'MESSAGE_FOR_CLIENT';
const MESSAGE_FOR_API = 'MESSAGE_FOR_API';
let cleanupSSEMap = (sseMap, keyToDelete) => {
    setTimeout(() => {
        if (sseMap[keyToDelete]) {
            sseMap[keyToDelete].res.end();
            delete sseMap[keyToDelete];
            logger.debug(`sseMap cleaned up for key: ${keyToDelete}`);
        }
        else {
            logger.debug(`could not clear sseMap as recipient: ${keyToDelete} was not found`);
        }
    }, process.env.MAX_API_CALL_IDLE_TIME * 1000);
};

let cleanUsersIfInactive = (sseUsers) => {
    setInterval(function() {
        let keys = Object.keys(sseUsers);
        let totalKeys = keys.length;
        let maxIdleTime = 1000 * 60 * process.env.MAX_USER_IDLE_TIME;
        let currenTime = new Date();

        logger.debug('cleaning inactive user streams');
    
        for(let i = 0; i < totalKeys; i++) {
            
            if(currenTime - sseUsers[keys[i]].timeStamp >= maxIdleTime) {
                sseUsers[keys[i]].res.end();
                delete sseUsers[keys[i]];
            }
        }
    }, 1000 * 60);
};
let cleanApiIfInactive = (sseApi) => {
    setInterval(function() {
        let keys = Object.keys(sseApi);
        let totalKeys = keys.length;
        let maxIdleTime = 1000 * process.env.MAX_API_CALL_IDLE_TIME;
        let currenTime = new Date();

        logger.debug('cleaning inactive api streams');

        for(let i = 0; i < totalKeys; i++) {

            if(currenTime - sseApi[keys[i]].timeStamp >= maxIdleTime) {
                sseApi[keys[i]].res.end();
                delete sseApi[keys[i]];
            }
        }
    }, 1000 * 60);
};

function publishToRedis(app, payload) {
    return Promise.resolve()
        .then(() => {
            if (app.redis && app.redis.workerPublisher) {
                let stringifiedPayload = JSON.stringify(payload);

                app.redis.workerPublisher.publish(
                    process.env.REDIS_WORKER_CHANNEL,
                    stringifiedPayload,
                    (err) => {
                        if (err) {
                            return Promise.reject(err);
                        }
                        logger.debug({
                            message: 'published worker data to redis'
                        });
                        return Promise.resolve();
                    });
            }
            else {
                let error = new Error('Could not publish to redis server as connection to redis is either down or corrupted');
                logger.error({
                    error,
                    message: 'could not publish data to redis'
                });
                return Promise.reject(error);
            }
        });
}

function sendSSEOutput(sseMapObject, recipient, eventType, status, data, messageFor) {
    try{
        logger.debug({
            message: `sending notification to ${messageFor}: ${recipient} for event: ${eventType}`,
            functionName: 'redis-subscription:listener'
        });
        if (sseMapObject[recipient]) {
            let sse = sseMapObject[recipient].sse;
            sse.send({ eventType, data , status});
            logger.debug(`SSE event sent to ${messageFor}`);
            sseMapObject[recipient].timeStamp = new Date();

        }
        else {
            logger.debug(`Could not find recipient ${recipient} in sseMapObject`);
        }
    }
    catch(error) {
        logger.error({
            error,
            message: 'Error occurred while sending SSE event',
            functionName: 'redis-subscription:listener'
        });
    }
}

module.exports = {
    cleanupSSEMap,
    cleanUsersIfInactive,
    publishToRedis,
    sendSSEOutput,
    cleanApiIfInactive,
    constants: {
        MESSAGE_FOR_CLIENT,
        MESSAGE_FOR_API
    }
};