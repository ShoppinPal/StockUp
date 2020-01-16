'use strict';
var path = require('path');
var fileName = path.basename(__filename, '.js'); // gives the filename without the .js extension
const logger = require('sp-json-logger')({fileName: 'server:boot:' + fileName});
var Promise = require('bluebird'); // jshint ignore:line
var CronJob = require('cron').CronJob;

module.exports = function (app) {
    var SchedulerModel = app.models.SchedulerModel;
    logger.debug({
        message: 'Will set up cron jobs for scheduled orders'
    });
    return SchedulerModel.find({
        where: {
            active: true,
            deleted: false
        }
    })
        .then(function (jobs) {
            logger.debug({
                message: 'Found these active scheduled jobs',
                jobs
            });
            return Promise.map(jobs, function (eachJob) {
                logger.debug({
                    message: 'Creating cron job for job',
                    jobId: eachJob.id
                });
                if (!SchedulerModel.activeCronJobs[eachJob.id]) {
                    SchedulerModel.activeCronJobs[eachJob.id] = new CronJob(eachJob.cronSchedule, function () {
                        logger.debug({
                            message: 'Created cron job for job Id',
                            jobId: eachJob.id
                        });
                        return SchedulerModel.runScheduledStockOrderJob(eachJob);
                    }, null, true);
                }
            });
        })
        .catch(function (error) {
            logger.error({
                message: 'Could not create cron jobs for scheduled orders',
                error
            });
        });
};
