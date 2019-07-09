'use strict';
const path = require('path');
const fileName = path.basename(__filename, '.js'); // gives the filename without the .js extension
let utils = require('../utils/utils');
const logger = require('sp-json-logger')({fileName: + 'notification-service:publisher' + fileName});

module.exports = (app) => {
    /**
     * Worker will call this endpoint once it finishes its task.
     * We will then publish the received message to redis.
     * POST /publish
     */
    app.post('/publish', function (req, res) {
        if (!req.body) {
            logger.error('Empty post request received for /publish from worker');
            res.status(400).send('POST body is missing');
        }
        let payload = req.body; // add object property validations!
        const publishPromises = [];
        if (payload instanceof Array){
            payload.forEach(notification => {
                publishPromises.push(utils.publishToRedis(app, notification));
            });
        } else {
            publishPromises.push(utils.publishToRedis(app, payload));
        }
            Promise.all(publishPromises)
                .then(() => {
                    res.send({
                        success: true,
                        message: 'worker payload published to redis'
                    });
                })
                .catch(error => {
                    res.status(500).send({
                        success: false,
                        error
                    });
                });
    });
};