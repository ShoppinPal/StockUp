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
const TODAYS_DATE = new Date();
var runMe = function (payload, config, taskId, messageId) {

    var orgModelId = payload.orgModelId;
    var storeModelId = payload.storeModelId;
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
                        message: 'Calculated Reorder points',
                        result
                    });
                    return Promise.resolve();
                })
                .catch(function (error) {
                    logger.error({
                        commandName: commandName,
                        message: 'Could not calculate and save reorder points',
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
        storeModelId: ObjectId(storeModelId)
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
                message: 'Found inventory model instances, will calculate reorder points for all of them',
                count: inventoryModelInstances.length,
                commandName,
                storeModelId,
                orgModelId
            });
            var averageDailyDemand = {};
            return Promise.map(inventoryModelInstances, function (eachInventoryModelInstance) {
                var product, category;

                logger.debug({
                    message: 'Average daily demand does not exist for inventory, will look for product model instances for the inventory',
                    eachInventoryModelInstance,
                    commandName
                });
                return db.collection('ProductModel').findOne({
                    _id: ObjectId(eachInventoryModelInstance.productModelId)
                })
                    .catch(function (error) {
                        logger.error({
                            message: 'Could not find product model for the inventory, will skip the product',
                            error,
                            commandName
                        });
                        return Promise.reject('Skipping inventory ID ' + eachInventoryModelInstance._id);
                    })
                    .then(function (productModelInstance) {
                        product = productModelInstance;
                        logger.debug({
                            message: 'Found product model instance for inventory, will look for its category model',
                            productModelInstance,
                            commandName
                        });
                        return db.collection('CategoryModel').findOne({
                            _id: ObjectId(productModelInstance.categoryModelId)
                        });
                    })
                    .catch(function (error) {
                        logger.error({
                            message: 'Could not find a category for the product, will skip MDQ and shelf capacities',
                            error,
                            commandName
                        });
                    })
                    .then(function (categoryModelInstance) {
                        category = categoryModelInstance;
                        logger.debug({
                            message: 'Found category model instance for product',
                            categoryModelInstance,
                            commandName
                        });
                        return db.collection('SalesLineItemsModel').find({
                            $and: [
                                {
                                    storeModelId: ObjectId(storeModelId)
                                },
                                {
                                    productModelId: ObjectId(eachInventoryModelInstance.productModelId)
                                },
                                {
                                    salesDate: {
                                        $lte: TODAYS_DATE
                                    }
                                }
                            ]
                        }).sort({
                            salesDate: 1
                        })
                            .toArray();
                    })
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

                        if (salesModelInstances.length) {
                            // if reorder point for the inventory hasn't been generated yet, then generate it from scratch
                            // if (!inventoryModelInstances.averageDailyDemand) { //TODO: do this part later
                                var totalQuantitiesSoldPerDate = {};
                                var totalQuantitiesSold = 0;
                                var totalNumberOfDaysSinceFirstSold;
                                for (var i = 0; i<salesModelInstances.length; i++) {
                                    totalQuantitiesSold += salesModelInstances[i].quantity || 1;
                                    if (!totalQuantitiesSoldPerDate[salesModelInstances[i].salesDate]) {
                                        totalQuantitiesSoldPerDate[salesModelInstances[i].salesDate] = salesModelInstances[i].quantity || 1;
                                    }
                                    else {
                                        totalQuantitiesSoldPerDate[salesModelInstances[i].salesDate] += salesModelInstances[i].quantity || 1;
                                    }
                                }
                                var millisecondsPerDay = 24 * 60 * 60 * 1000;
                                totalNumberOfDaysSinceFirstSold = Math.round((TODAYS_DATE - new Date(salesModelInstances[0].salesDate)) / millisecondsPerDay);
                                averageDailyDemand = totalQuantitiesSold / totalNumberOfDaysSinceFirstSold;
                                var standardDeviation;
                                var averageMinusValueSquareSummation = 0; //sigma of (x minus x bar)^2
                                var arrayOfDatesOfSales = Object.keys(totalQuantitiesSoldPerDate);
                                for (var i = 0; i<arrayOfDatesOfSales.length; i++) {
                                    averageMinusValueSquareSummation += Math.pow(totalQuantitiesSoldPerDate[arrayOfDatesOfSales[i]] - averageDailyDemand, 2);
                                }
                                for (var i = 0; i<totalNumberOfDaysSinceFirstSold - arrayOfDatesOfSales.length; i++) {
                                    averageMinusValueSquareSummation += Math.pow(0 - averageDailyDemand, 2);
                                }
                                standardDeviation = Math.pow(averageMinusValueSquareSummation / totalNumberOfDaysSinceFirstSold, 0.5);
                                //tempMin is not of much use here, since we are considering a periodic replenishment system of 1 week for each store
                                var tempMin = LEAD_TIME_IN_DAYS * (averageDailyDemand + standardDeviation) + (CSL_MULTIPLIER * standardDeviation * Math.pow(LEAD_TIME_IN_DAYS, 0.5));
                                var tempMax = (LEAD_TIME_IN_DAYS + REVIEW_TIME_IN_DAYS) * (averageDailyDemand + standardDeviation) + (CSL_MULTIPLIER * standardDeviation * Math.pow((LEAD_TIME_IN_DAYS + REVIEW_TIME_IN_DAYS), 0.5));
                                var MIN, MAX;
                                if (category.min && category.min[storeModelId]>=0 && category.max && category.max[storeModelId]>=0) {
                                    MIN = category.min[storeModelId]>tempMin ? category.min[storeModelId] : tempMin;
                                    MAX = (tempMax + category.min[storeModelId])<category.max[storeModelId] ? (tempMax + category.min[storeModelId]) : category.max[storeModelId];
                                }
                                logger.debug({
                                    totalQuantitiesSoldPerDate,
                                    arrayOfDatesOfSales,
                                    MDQ: category.min[storeModelId],
                                    MaxShelfCapacity: category.max[storeModelId],
                                    averageMinusValueSquareSummation,
                                    totalQuantitiesSold,
                                    totalNumberOfDaysSinceFirstSold,
                                    commandName,
                                    storeModelId,
                                    orgModelId,
                                    averageDailyDemand,
                                    standardDeviation,
                                    inventoryModelId: eachInventoryModelInstance._id,
                                    tempMax,
                                    tempMin,
                                    MAX,
                                    MIN,
                                    productName: product.name,
                                    sku: product.sku
                                });
                                return db.collection('InventoryModel').updateOne({
                                    _id: ObjectId(eachInventoryModelInstance._id)
                                }, {
                                    $set: {
                                        averageDailyDemand: averageDailyDemand,
                                        standardDeviation: standardDeviation,
                                        averageDailyDemandCalculationDate: new Date(),
                                        standardDeviationCalculationDate: new Date(),
                                        reorder_point: MAX ? Math.round(MAX) : Math.round(tempMax), //reorder quantities to this point
                                        reorder_threshold: MIN ? Math.round(MIN) : Math.round(tempMin), //reorder quantities if product below this level
                                    }
                                });
                            // }
                            // if reorder point has already been generated, then calculate new reorder point based on previous data
                            // else {
                            //     logger.debug({
                            //         message: 'Standard deviation has already been calculated earlier, will calculate incremental Standard deviation',
                            //         inventoryModelId: eachInventoryModelInstance._id,
                            //         commandName
                            //     });
                            //
                            //
                            // }
                        }
                        else {
                            logger.debug({
                                message: 'There is no previous sales data available, will move on to next one',
                                eachInventoryModelInstance
                            });
                            return Promise.resolve();
                        }
                    })
                    .catch(function (error) {
                        logger.error({
                            message: 'Could not update average daily demand and standard deviation for inventory, will move on to next one',
                            inventoryModelId: eachInventoryModelInstance._id,
                            commandName,
                            error
                        });
                        return Promise.resolve('Could not update average daily demand and standard deviation for inventory, will move on to next one');
                    })
                    .then(function (result) {
                        logger.debug({
                            message: 'Updated Average Daily Demand, Standard Deviation and Reorder points for inventory',
                            inventoryModelId: eachInventoryModelInstance._id,
                            commandName
                        });
                        return Promise.resolve('Updated reorder point for inventory ' + eachInventoryModelInstance._id);
                    });


            });

        })
}
