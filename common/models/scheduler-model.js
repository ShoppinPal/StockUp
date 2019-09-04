'use strict';
var path = require('path');
var workerUtils = require('../utils/workers');
const fileName = path.basename(__filename, '.js'); // gives the filename without the .js extension
const logger = require('sp-json-logger')({fileName: 'common:models:' + fileName});

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
    function calculateNextRun(frequency, date, month, hour, weekDay) {
        var nextDate= new Date();
        nextDate.setMinutes(0);
        nextDate.setSeconds(0);
        nextDate.setMilliseconds(0);
        var currentDate = new Date();
        logger.debug({type: "Date ", nextDate, currentDate,frequency, date, month, hour, weekDay});
        if (frequency === SchedulerModel.FREQUENCY.YEARLY) {
            nextDate.setMonth(month);
            nextDate.setHours(hour);
            nextDate.setDate(date);
            if (nextDate < currentDate) {
                nextDate.setFullYear(nextDate.getFullYear() + 1, month, date);
            }
            logger.debug({type: "Date ", nextDate, currentDate});
        } else if (frequency === SchedulerModel.FREQUENCY.MONTHLY) {
            nextDate.setHours(hour);
            nextDate.setDate(date);
            if (nextDate < currentDate) {
                nextDate.setMonth(nextDate.getMonth() + 1);
            }
            logger.debug({type: "Month Date ", nextDate, currentDate});
        } else if (frequency === SchedulerModel.FREQUENCY.DAILY) {
            nextDate.setHours(hour);
            if (nextDate < currentDate) {
                nextDate.setDate(nextDate.getDate() + 1);
            }
            logger.debug({type: "Daily Date ", nextDate, currentDate});
        } else if (frequency === SchedulerModel.FREQUENCY.WEEKLY) {
            weekDay = weekDay.sort();
            var minWeekDay = null;
            for (let i = 0; i < weekDay.length; i++) {
                if (weekDay[i] >= currentDate.getDay() && hour > currentDate.getHours()) {
                    minWeekDay = weekDay[i];
                    break;
                }
            }
            if (minWeekDay === null && weekDay.length > 0) {
                minWeekDay = weekDay[0];
            }

            if (minWeekDay === currentDate.getDay()) {
                if (hour > currentDate.getHours()) {
                    nextDate.setHours(hour);
                } else {
                    nextDate.setDate(currentDate.getDate() + 7);
                    nextDate.setHours(hour);
                }
            } else if (minWeekDay > currentDate.getDay()) {
                nextDate.setHours(hour);
                nextDate.setDate(currentDate.getDate() + (minWeekDay - currentDate.getDay()));
            } else if (minWeekDay < currentDate.getDay()) {
                nextDate.setHours(hour);
                nextDate.setDate(currentDate.getDate() + 7 - (currentDate.getDay() - minWeekDay));
            }
            logger.debug({type: "Weekly Date ", nextDate, currentDate});
        } else if (frequency === SchedulerModel.FREQUENCY.HOURLY) {
            nextDate.setHours(nextDate.getHours() + 1);
            logger.debug({type: "Hourly Date ", nextDate, currentDate});
        }
        return nextDate;
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

    SchedulerModel.addSchedule = function(orgModelId, userModelId,jobType, frequency,day, month, hour, weekDay,data){
        logger.debug({
            params: this.arguments,
            message: 'Will Validate Scheduled Job Inputs',
            functionName: 'addSchedule',
            orgModelId, userModelId,jobType, frequency,day, month, hour, weekDay,data
        });
        // Validate Parameters as per frequency
        if (!frequency){
            return Promise.reject('Frequency is required');
        }
        if (frequency === SchedulerModel.FREQUENCY.YEARLY){
            weekDay = undefined;
            if ( isNaN(day) ||  isNaN(month) || isNaN(hour)){
                return Promise.reject('Hour, Month and Day are required');
            }
        } else if(frequency === SchedulerModel.FREQUENCY.MONTHLY) {
            weekDay = undefined;
            month = undefined;
            if ( isNaN(day) || isNaN(hour)){
                return Promise.reject('Hour and Day are required');
            }
        } else if(frequency === SchedulerModel.FREQUENCY.DAILY) {
            weekDay = undefined;
            month = undefined;
            day = undefined;
            if (isNaN(hour)) {
                return Promise.reject('Hour is required');
            }
        } else if(frequency === SchedulerModel.FREQUENCY.WEEKLY) {
            month = undefined;
            day = undefined;
            if (weekDay.length === 0){
                return Promise.reject('WeekDay is required');
            }
            if (isNaN(hour)){
                return Promise.reject('Hour is required');
            }
        } else if (frequency === SchedulerModel.FREQUENCY.HOURLY) {
            month = undefined;
            day = undefined;
            hour = undefined;
            weekDay = undefined;
        }else{
            return Promise.reject('Invalid Frequency');
        }
        logger.debug({
            message: 'Will Create a Scheduled Job',
            functionName: 'addSchedule'
        });
        return SchedulerModel.create({
            day,
            month,
            hour,
            frequency,
            nextRun: calculateNextRun(frequency, day, month, hour, weekDay),
            active: true,
            jobType,
            weekDay,
            userModelId,
            orgModelId,
            data
        }).then(function (schedulerModelInstance) {
            logger.debug({
                message: 'Created a Scheduled Job',
                functionName: 'generateStockOrderVend'
            });
            return Promise.resolve('Job Scheduled Successfully');
        }).catch(function (e) {
            logger.error({
                e,
                message: 'Error creating Scheduled Job',
                functionName: 'addSchedule'
            });
            return Promise.reject('Error in scheduling job');
        });
    };

    SchedulerModel.runStockOrderJobs = function () {
        var foundJobs = [];
        var currentDate = new Date();
        currentDate.setMilliseconds(0);
        logger.debug({
            functionName: 'runStockOrderJobs',
            date: currentDate
        });
        var whereClause = {
            active: true,
            deleted: false,
            jobType: SchedulerModel.JOB_TYPES.STOCK_ORDER,
            or:[
                {
                    nextRun: {
                        lt: currentDate
                    }
                },
                {
                    nextRun: currentDate
                }
            ]
        };

        SchedulerModel.find({
            where: whereClause
        })
            .then(function (jobs) {
                logger.debug({
                    message: 'Jobs Result',
                    functionName: 'runStockOrderJobs',
                    noOfJobs: jobs.length
                });
                foundJobs = jobs;
                return Promise.map(
                    jobs,
                    function (job) {
                        if (job.data.integrationType === 'vend') {
                            let {id, storeModelId, supplierModelId, warehouseModelId, options} = job.data;
                            let payload = {
                                orgModelId: id,
                                storeModelId: storeModelId,
                                supplierModelId: supplierModelId,
                                warehouseModelId: warehouseModelId,
                                loopbackAccessToken: options.accessToken,
                                op: 'generateStockOrderVend'
                            };
                            return workerUtils.sendPayLoad(payload)
                                .then(function (response) {
                                    logger.debug({
                                        message: 'Sent generateStockOrderVend to worker',
                                        options,
                                        response,
                                        functionName: 'runStockOrderJobs'
                                    });
                                    return Promise.resolve('Stock order generation initiated');
                                })
                                .catch(function (error) {
                                    logger.error({
                                        message: 'Could not send generateStockOrderVend to worker',
                                        options,
                                        error,
                                        functionName: 'runStockOrderJobs'
                                    });
                                    return Promise.reject('Error in creating stock order');
                                });
                        } else if (job.data.integrationType === 'msdynamics') {
                            let {id, storeModelId, warehouseModelId, categoryModelId, options} = job.data;
                            let payload = {
                                orgModelId: id,
                                storeModelId: storeModelId,
                                warehouseModelId: warehouseModelId,
                                categoryModelId: categoryModelId,
                                loopbackAccessToken: options.accessToken,
                                op: 'generateStockOrderMSD'
                            };
                            return workerUtils.sendPayLoad(payload)
                                .then(function (response) {
                                    logger.debug({
                                        message: 'Sent generateStockOrderMSD to worker',
                                        options,
                                        response,
                                        functionName: 'runStockOrderJobs'
                                    });
                                    return Promise.resolve('Stock order generation initiated');
                                })
                                .catch(function (error) {
                                    logger.error({
                                        message: 'Could not send generateStockOrderMSD to worker',
                                        options,
                                        error,
                                        functionName: 'runStockOrderJobs'
                                    });
                                    return Promise.reject('Error in creating stock order');
                                });
                        }
                    },
                    {concurrency: 1}
                );

            })
            .catch(function (e) {
                logger.error({
                    message: 'Could not Create Stock Orders',
                    e,
                    functionName: 'runStockOrderJobs'
                });
            })
            .then(function (data) {
                logger.debug({
                    message: 'Stock Orders Job Ran Successfully',
                    functionName: 'runStockOrderJobs',
                });
                return Promise.map(
                    foundJobs,
                    function (job) {
                        return SchedulerModel.updateAll({id: job.id}, {
                            lastGoodRun: new Date(),
                            nextRun: calculateNextRun(job.frequency, job.day, job.month, job.hour, job.weekDay)
                        });
                    },
                    {concurrency: 1}
                );
            })
            .then(function (SchedulerModelUpdateInfo) {
                logger.debug({
                    message: 'Scheduled Jobs Last Sync Updated',
                    functionName: 'runStockOrderJobs'
                });
            })
            .catch(function (e) {
                logger.error({
                    message: 'Could not Update Jobs Status',
                    e,
                    functionName: 'runStockOrderJobs'
                });
            });
    };
};
