'use strict';

let redis = require('redis');
let logger = require('sp-json-logger')();
let EventEmitter = require('events').EventEmitter;

function initSubscriber(app){
    return Promise.resolve()
            .then(() => {
                logger.debug(process.env);
                let eventEmitter = new EventEmitter();
                app.redis.workerSubscriber = null;
                // Subscriber client
                app.redis.workerSubscriber = redis.createClient(
                    process.env.REDIS_PORT, 
                    process.env.REDIS_HOST,
                    {auth_pass: process.env.REDIS_PASSWORD, no_ready_check: true}
                );
                
                app.redis.workerSubscriber.subscribe(process.env.REDIS_WORKER_CHANNEL);

                app.redis.workerSubscriber.on('connect', () => {
                    eventEmitter.emit('redis-connected');
                    logger.info('workerSubscriber connected to redis');
                });

                app.redis.workerSubscriber.on('error', (e) => {
                    eventEmitter.emit('error-connecting-redis');
                    logger.error({
                        message: 'workerSubscriber could not connect to redis',
                        error: e
                    });
                });

                eventEmitter.on('error-connecting-redis', () => {
                    app.emit('redis-connection-error');
                    return Promise.reject(new Error('Error occurred while connecting to redis'));
                });
            
                eventEmitter.on('redis-connected', () => {
                    logger.debug('Connected to redis server');
                    app.emit('redis-subscriber-connected');
                    return Promise.resolve();
                });
            });
}

function initPublisher(app) {
    return Promise.resolve()
        .then(() => {
            let eventEmitter = new EventEmitter();
            app.redis.workerPublisher = null;
            // Publisher client
            app.redis.workerPublisher = redis.createClient(
                process.env.REDIS_PORT,
                process.env.REDIS_HOST,
                {auth_pass: process.env.REDIS_PASSWORD, no_ready_check: true}
            );

            app.redis.workerPublisher.on('connect', () => {
                eventEmitter.emit('redis-connected');
                logger.info('workerPublisher connected to redis');
            });

            app.redis.workerPublisher.on('error', (e) => {
                eventEmitter.emit('error-connecting-redis');
                logger.error({
                    message: 'workerPublisher could not connect to redis',
                    error: e
                });
            });

            eventEmitter.on('error-connecting-redis', () => {
                app.emit('redis-connection-error');
                return Promise.reject(new Error('Error occurred while connecting to redis'));
            });

            eventEmitter.on('redis-connected', () => {
                logger.debug('Connected to redis server');
                app.emit('redis-publisher-connected');
                return Promise.resolve();
            });
        });
}

module.exports = (app) => {
    if (!app.redis) {
        app.redis = {};
    }
    initSubscriber(app);
    initPublisher(app);
};