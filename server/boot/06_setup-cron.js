'use strict';
var path = require('path');
var fileName = path.basename(__filename, '.js'); // gives the filename without the .js extension
const logger = require('sp-json-logger')({fileName: 'server:boot:' + fileName});
var Promise = require('bluebird'); // jshint ignore:line
var CronJob = require('cron').CronJob;

module.exports = function (app) {
    var SchedulerModel = app.models.SchedulerModel;
    logger.debug({
        message: 'Setting Up Cron Job',
    });
    new CronJob('0 0 * * * *', function() {
        logger.debug({
            message: 'Executing Cron Job',
            timestamp: new Date()
        });
        SchedulerModel.runStockOrderJobs();
    }, null, true);
};
