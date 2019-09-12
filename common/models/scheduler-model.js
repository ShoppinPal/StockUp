'use strict';
var path = require('path');
var workerUtils = require('../utils/workers');
const fileName = path.basename(__filename, '.js'); // gives the filename without the .js extension
const logger = require('sp-json-logger')({fileName: 'common:models:' + fileName});
var CronJob = require('cron').CronJob;

module.exports = function (SchedulerModel) {

    SchedulerModel.on('dataSourceAttached', function (obj) {
        // wrap the whole model in Promise
        // but we need to avoid 'validate' method
        SchedulerModel = Promise.promisifyAll(
            SchedulerModel,
            {
                filter: function (name, func, target) {
                    return !(name == 'validate');
                }
            }
        );
    });

    SchedulerModel.observe('after save', function (ctx, next) {
        if (ctx.isNewInstance) {
            logger.debug({
                message: 'Will create a new cron job for scheduler instance',
                instance: ctx.instance,
                functionName: 'after save'
            });
            SchedulerModel.activeCronJobs[ctx.instance.id] = new CronJob(ctx.instance.cronSchedule, function () {
                logger.debug({
                    message: 'Executing this cron job',
                    ctx,
                    functionName: 'after save'
                });
                if (ctx.instance.jobType === SchedulerModel.JOB_TYPES.STOCK_ORDER) {
                    SchedulerModel.runScheduledStockOrderJob(ctx.instance);
                }
                else {
                    logger.debug({
                        message: 'This job type is not supported yet',
                        ctx,
                        functionName: 'after save'
                    });
                }
            }, null, true);
            next();
        }
        else {
            logger.debug({
                message: 'Updated scheduler instance, will update the cron job accordingly',
                instance: ctx,
                functionName: 'after save'
            });
            if (ctx.instance && (!ctx.instance.active || ctx.instance.deleted)) {
                SchedulerModel.activeCronJobs[ctx.instance.id].stop();
                logger.debug({
                    message: 'Stopped the cron job for scheduler instance',
                    instance: ctx.instance,
                    functionName: 'after save'
                });
                next();
            }
            else if (ctx.instance && ctx.instance.active && !ctx.instance.deleted) {
                SchedulerModel.activeCronJobs[ctx.instance.id] = new CronJob(ctx.instance.cronSchedule, function () {
                    logger.debug({
                        message: 'Executing this cron job',
                        instance: ctx.instance,
                        functionName: 'after save'
                    });
                    if (ctx.instance.jobType === SchedulerModel.JOB_TYPES.STOCK_ORDER) {
                        SchedulerModel.runScheduledStockOrderJob(ctx.instance);
                    }
                    else {
                        logger.debug({
                            message: 'This job type is not supported yet',
                            instance: ctx.instance,
                            functionName: 'after save'
                        });
                    }
                }, null, true);
                next();
            }
        }
    });

    function calculateCronSchedule(frequency, date, month, hour, weekDay) {
        try {
            var cronSchedule;
            logger.debug({
                type: "Date",
                frequency,
                date,
                month,
                hour,
                weekDay,
                functionName: 'calculateCronSchedule'
            });
            if (frequency === SchedulerModel.FREQUENCY.YEARLY) {
                cronSchedule = '0 0 ' + hour + ' ' + date + ' ' + month + ' *';
            }
            else if (frequency === SchedulerModel.FREQUENCY.MONTHLY) {
                cronSchedule = '0 0 ' + hour + ' ' + date + ' * *';

            }
            else if (frequency === SchedulerModel.FREQUENCY.DAILY) {
                cronSchedule = '0 0  ' + hour + ' * * *';
            }
            else if (frequency === SchedulerModel.FREQUENCY.WEEKLY) {
                cronSchedule = '0 0 ' + hour + ' * * ' + weekDay.toString();
            }
            else if (frequency === SchedulerModel.FREQUENCY.HOURLY) {
                cronSchedule = '0 0 * * * *';
            }
            return cronSchedule;
        }
        catch (error) {
            logger.error({
                error,
                functionName: 'calculateCronSchedule'
            });
            return error;
        }
    }

    SchedulerModel.JOB_TYPES = {
        STOCK_ORDER: 'stock-order'
    };
    SchedulerModel.FREQUENCY = {
        YEARLY: 'Yearly',
        MONTHLY: 'Monthly',
        DAILY: 'Daily',
        WEEKLY: 'Weekly',
        HOURLY: 'Hourly',
    };

    SchedulerModel.addSchedule = function (orgModelId, jobType, frequency, day, month, hour, weekDay, data, options) {
        logger.debug({
            message: 'Will Validate Scheduled Job Inputs',
            functionName: 'addSchedule',
            orgModelId,
            jobType,
            frequency,
            day,
            month,
            hour,
            weekDay,
            data,
            options
        });
        // Validate Parameters as per frequency
        if (!frequency) {
            return Promise.reject('Frequency is required');
        }
        if (frequency === SchedulerModel.FREQUENCY.YEARLY) {
            weekDay = undefined;
            if (isNaN(day) || isNaN(month) || isNaN(hour)) {
                return Promise.reject('Hour, Month and Day are required');
            }
        }
        else if (frequency === SchedulerModel.FREQUENCY.MONTHLY) {
            weekDay = undefined;
            month = undefined;
            if (isNaN(day) || isNaN(hour)) {
                return Promise.reject('Hour and Day are required');
            }
        }
        else if (frequency === SchedulerModel.FREQUENCY.DAILY) {
            weekDay = undefined;
            month = undefined;
            day = undefined;
            if (isNaN(hour)) {
                return Promise.reject('Hour is required');
            }
        }
        else if (frequency === SchedulerModel.FREQUENCY.WEEKLY) {
            month = undefined;
            day = undefined;
            if (weekDay.length === 0) {
                return Promise.reject('WeekDay is required');
            }
            if (isNaN(hour)) {
                return Promise.reject('Hour is required');
            }
        }
        else if (frequency === SchedulerModel.FREQUENCY.HOURLY) {
            month = undefined;
            day = undefined;
            hour = undefined;
            weekDay = undefined;
        }
        else {
            return Promise.reject('Invalid Frequency');
        }
        logger.debug({
            message: 'Will Create a Cron Job',
            functionName: 'addSchedule',
            options
        });
        var cronSchedule = calculateCronSchedule(frequency, day, month, hour, weekDay);
        return SchedulerModel.create({
            day,
            month,
            hour,
            frequency,
            cronSchedule,
            active: true,
            jobType,
            weekDay,
            orgModelId,
            data,
            userModelId: options.accessToken.userId
        })
            .then(function (schedulerModelInstance) {
                logger.debug({
                    message: 'Created a Scheduled Job',
                    schedulerModelInstance,
                    functionName: 'addSchedule',
                    options
                });
            })
            .catch(function (e) {
                logger.error({
                    e,
                    message: 'Error creating Scheduled Job',
                    functionName: 'addSchedule',
                    options
                });
                return Promise.reject('Error in scheduling job');
            });
    };

    SchedulerModel.runScheduledStockOrderJob = function (scheduledJobInstance) {
        logger.debug({
            message: 'Will look for the user who created this job',
            scheduledJobInstance,
            functionName: 'runScheduledStockOrderJob'
        });
        return SchedulerModel.app.models.UserModel.findOne({
            where: {
                id: scheduledJobInstance.userModelId
            }
        })
            .catch(function (error) {
                logger.error({
                    message: 'Could not find user who created the job',
                    error,
                    functionName: 'runScheduledStockOrderJob'
                });
                return Promise.reject('Could not find user who created the job');
            })
            .then(function (userModelInstance) {
                logger.debug({
                    message: 'Found this user, will create a short-lived access token',
                    userModelInstance,
                    functionName: 'runScheduledStockOrderJob'
                });
                return userModelInstance.createAccessToken(7200);
            })
            .then(function (accessToken) {
                logger.debug({
                    message: 'Created a short lived token for user, will create stock order',
                    functionName: 'runScheduledStockOrderJob'
                });
                if (scheduledJobInstance.data.integrationType === 'vend') {
                    return SchedulerModel.app.models.ReportModel.generateStockOrderVend(
                        scheduledJobInstance.orgModelId,
                        scheduledJobInstance.data.storeModelId,
                        scheduledJobInstance.data.supplierModelId,
                        scheduledJobInstance.data.name,
                        scheduledJobInstance.data.warehouseModelId,
                        undefined,
                        {accessToken}
                    )
                        .catch(function (error) {
                            logger.error({
                                message: 'Could not create stock order for vend',
                                error,
                                functionName: 'runScheduledStockOrderJob'
                            });
                            return Promise.reject('Could not create stock order for vend');
                        });
                }
                else if (job.data.integrationType === 'msdynamics') {
                    return SchedulerModel.app.models.ReportModel.generateStockOrderMSD(
                        scheduledJobInstance.orgModelId,
                        scheduledJobInstance.data.storeModelId,
                        scheduledJobInstance.data.warehouseModelId,
                        scheduledJobInstance.data.categoryModelId,
                        undefined,
                        {accessToken}
                    )
                        .catch(function (error) {
                            logger.error({
                                message: 'Could not create stock order for MSD',
                                error,
                                functionName: 'runScheduledStockOrderJob'
                            });
                            return Promise.reject('Could not create stock order for MSD');
                        });
                }
            })
            .then(function (response) {
                logger.debug({
                    message: 'Created stock order, will update scheduled order time run',
                    response,
                    functionName: 'runScheduledStockOrderJob'
                });
                return SchedulerModel.updateAll({
                    id: scheduledJobInstance.id
                }, {
                    lastGoodRun: new Date()
                });
            })
            .catch(function (error) {
                logger.error({
                    message: 'Could not update scheduled order run time',
                    error,
                    functionName: 'runScheduledStockOrderJob'
                });
                return Promise.reject('Could not update scheduled order run time');
            });
    };

    SchedulerModel.activeCronJobs = {};

};
