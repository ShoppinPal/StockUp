const logger = require('sp-json-logger')();
const sql = require('mssql');
const dbUrl = process.env.DB_URL;
const MongoClient = require('mongodb').MongoClient;
const ObjectId = require('mongodb').ObjectID;
var db = null; //database connected
const utils = require('./../../jobs/utils/utils.js');
const path = require('path');
sql.Promise = require('bluebird');
const _ = require('underscore');
const Promise = require('bluebird');
const commandName = path.basename(__filename, '.js'); // gives the filename without the .js extension
const LEAD_TIME_IN_DAYS = 1;
const REVIEW_TIME_IN_DAYS = 1;
const CSL_MULTIPLIER = 1.03; //NORMSINV(0.85) 85% success rate
var runMe = function (sqlPool, orgModelId, storeModelId) {
    try {
        // Global variable for logging

        logger.debug({
            commandName: commandName,
            argv: process.argv,
            env: process.env,
            orgModelId,
            storeModelId
        });

        try {
            logger.debug({
                commandName: commandName,
                message: 'This worker will calculate reorder points for the given store',
                orgModelId,
                storeModelId
            });
            return Promise.resolve()
                .then(function (pool) {
                    logger.debug({
                        message: 'Will connect to Mongo DB',
                        commandName
                    });
                    return MongoClient.connect(dbUrl, {promiseLibrary: Promise});
                })
                .catch(function (error) {
                    logger.error({
                        message: 'Could not connect to Mongo DB',
                        error,
                        commandName
                    });
                    return Promise.reject('Could not connect to Mongo DB');
                })
                .then(function (dbInstance) {
                    db = dbInstance;
                    logger.debug({
                        message: 'Connected to Mongo DB',
                        commandName
                    });
                    return calculateMinMax(orgModelId, storeModelId);
                })
                .then(function (result) {
                    logger.debug({
                        commandName: commandName,
                        message: 'Calculated Min',
                        result
                    });
                    logger.debug({
                        commandName: commandName,
                        message: 'Will go on to update status in DB'
                    });
                    return db.collection('SyncModel').updateOne({
                            $and: [
                                {
                                    'orgModelId': ObjectId(orgModelId)
                                },
                                {
                                    'name': 'inventory'
                                }
                            ],
                        },
                        {
                            $set: {
                                'syncInProcess': false,
                                'workerTaskId': '',
                                'lastSyncedAt': new Date()
                            }
                        });
                })
                .then(function (response) {
                    logger.debug({
                        commandName: commandName,
                        message: 'Updated inventory sync model in DB',
                        result: response ? response.result || response : ''
                    });
                    return Promise.resolve();
                })
                .catch(function (error) {
                    logger.error({
                        commandName: commandName,
                        message: 'Could not fetch and save inventory',
                        err: error
                    });
                    return Promise.reject(error);
                })
                .finally(function () {
                    logger.debug({
                        commandName: commandName,
                        message: 'Closing database connection'
                    });
                    if (db) {
                        return db.close();
                    }
                    return Promise.resolve();
                })
                .catch(function (error) {
                    logger.error({
                        commandName: commandName,
                        message: 'Could not close db connection',
                        err: error
                    });
                    return Promise.resolve();
                    //TODO: set a timeout, after which close all listeners
                });
        }
        catch (e) {
            logger.error({commandName: commandName, message: '2nd last catch block', err: e});
            throw e;
        }
    }
    catch (e) {
        logger.error({message: 'last catch block', err: e});
        throw e;
    }
};


module.exports = {
    run: runMe
};

function calculateMinMax(orgModelId, storeModelId) {
    logger.debug({
        message: 'Will calculate min/max for the following store',
        storeModelId,
        orgModelId,
        commandName
    });
    logger.debug({
        message: 'Looking for inventory models of the store',
        storeModelId,
        orgModelId,
        commandName
    });
    return db.collection('InventoryModel').find({
        storeModelId: storeModelId
    }).toArray()
        .catch(function (error) {
            logger.error({
                message: 'Could not find the inventory model instances of the store, will exit',
                error,
                commandName,
                orgModelId,
                storeModelId
            });
            return Promise.reject(error);
        })
        .then(function (inventoryModelInstances) {
            logger.debug({
                message: 'Found inventory model instances',
                count: inventoryModelInstances.length,
                commandName,
                storeModelId,
                orgModelId
            });
            var averageDailyDemand = {};
            return Promise.map(inventoryModelInstances, function (eachInventoryModelInstance) {
                //if reorder point for the inventory hasn't been generated yet, then generate it from scratch
                if (!inventoryModelInstances.averageDailyDemand) {
                    logger.debug({
                        message: 'Average daily demand does not exist for inventory, will look for sales model instances for the inventory',
                        eachInventoryModelInstance,
                        commandName
                    });
                    return db.collection('SalesModel').find({
                        $and: [
                            {
                                storeModelId: storeModelId
                            },
                            {
                                productModelId: eachInventoryModelInstance.productModelId
                            }
                        ]
                    }).sort({
                        salesDate: 1
                    })
                        .toArray()
                        .catch(function (error) {
                            logger.error({
                                message: 'Could not find the sales model instances for this inventory',
                                error,
                                eachInventoryModelInstance,
                                commandName
                            });
                            return Promise.resolve('Could not find the sales model instances for this inventory, will move on');
                        })
                        .then(function (salesModelInstances) {
                            logger.debug({
                                message: 'Found sales models for the inventory',
                                count: salesModelInstances.length,
                                eachInventoryModelInstance,
                                commandName,
                                firstSale: salesModelInstances[0]
                            });
                            var totalQuantitiesSold = 0;
                            var totalNumberOfDaysSinceFirstSold;
                            for (var i = 0; i<salesModelInstances.length; i++) {
                                totalQuantitiesSold += salesModelInstances[i].quantity
                            }
                            totalNumberOfDaysSinceFirstSold = salesModelInstances[0].salesDate - new Date();
                            averageDailyDemand = totalQuantitiesSold / totalNumberOfDaysSinceFirstSold;
                            var standardDeviation;
                            var averageMinusValueSquareSummation; //sigma of (x minus x bar)^2
                            for (var i = 0; i<salesModelInstances.length; i++) {
                                averageMinusValueSquareSummation += Math.pow(salesModelInstances[i].quantity - averageDailyDemand, 2);
                            }
                            standardDeviation = Math.pow(averageMinusValueSquareSummation/totalNumberOfDaysSinceFirstSold, 0.5);
                            //tempMin is not of much use here, since we are considering a periodic replenishment system of 1 week for each store
                            var tempMin = LEAD_TIME_IN_DAYS * (averageDailyDemand + standardDeviation) + (CSL_MULTIPLIER * standardDeviation * Math.pow(LEAD_TIME_IN_DAYS, 0.5));
                            var tempMax = (LEAD_TIME_IN_DAYS + REVIEW_TIME_IN_DAYS) * (averageDailyDemand + standardDeviation) + (CSL_MULTIPLIER * standardDeviation * Math.pow((LEAD_TIME_IN_DAYS + REVIEW_TIME_IN_DAYS), 0.5));
                            logger.debug({
                                totalQuantitiesSold,
                                totalNumberOfDaysSinceFirstSold,
                                commandName,
                                storeModelId,
                                orgModelId,
                                averageDailyDemand,
                                standardDeviation,
                                inventoryModelId: eachInventoryModelInstance._id,
                                tempMax
                            });
                            return db.collection('InventoryModel').updateOne({
                                _id: eachInventoryModelInstance._id
                            }, {
                                $set: {
                                    averageDailyDemand: averageDailyDemand,
                                    standardDeviation: standardDeviation,
                                    averageDailyDemandCalculationDate: new Date(),
                                    standardDeviationCalculationDate: new Date(),
                                    reorder_point: Math.ceil(tempMax) //reorder quantities to this point
                                }
                            });
                        })
                        .catch(function (error) {
                            logger.error({
                                message: 'Could not update average daily demand and standard deviation for inventory, will move on to next one',
                                inventoryModelId: eachInventoryModelInstance._id,
                                commandName
                            });
                            return Promise.resolve('Could not update average daily demand and standard deviation for inventory, will move on to next one');
                        })
                        .then(function (result) {
                            logger.debug({
                                message: 'Updated Average Daily Demand, Standard Deviation and Reorder points for inventory',
                                inventoryModelId: eachInventoryModelInstance._id,
                                commandName
                            });
                            return Promise.resolve('Updated reorder point for inventory '+eachInventoryModelInstance._id);
                        });
                }
                //if reorder point has already been generated, then calculate new reorder point based on previous data
                else {

                }
            });

        })
}
