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
                    return calculateMinMax(orgModelId, storeModelId, messageId);
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

function calculateMinMax(orgModelId, storeModelId, messageId) {
    try {

        var inventoryModelInstancesToCalculate = [], productModels, salesModels;
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
                        message: 'Found inventory model instances, will fetch products and sales history',
                        count: inventoryModelInstances.length,
                        commandName,
                        storeModelId,
                        orgModelId
                    });

                    var productModelIds = _.difference(_.pluck(inventoryModelInstances, 'productModelId'), _.pluck(_.find(inventoryModelInstances, function (eachInventory) {
                        return eachInventory.standardDeviationCalculationDate &&
                            eachInventory.standardDeviationCalculationDate.getDate() === TODAYS_DATE.getDate() &&
                            eachInventory.standardDeviationCalculationDate.getMonth() === TODAYS_DATE.getMonth() &&
                            eachInventory.standardDeviationCalculationDate.getYear() === TODAYS_DATE.getYear();
                    }), 'productModelId'));

                    if (!productModelIds.length) {
                        return Promise.resolve([0, 0]);
                    }
                    return Promise.all([
                        db.collection('ProductModel').find({
                            _id: {
                                $in: productModelIds
                            }
                        }).toArray(),
                        db.collection('SalesLineItemsModel').find({
                            $and: [
                                {
                                    storeModelId: ObjectId(storeModelId)
                                },
                                {
                                    productModelId: {
                                        $in: productModelIds
                                    }
                                },
                                {
                                    salesDate: {
                                        $lte: TODAYS_DATE
                                    }
                                }
                            ]
                        }).toArray()
                    ]);
                }
            )
            .catch(function (error) {
                logger.error({
                    message: 'Could not find product and sales models',
                    error,
                    messageId
                });
                return Promise.reject('Could not find product and sales models');
            })
            .then(function (response) {
                logger.debug({
                    message: 'Found sales and product models, will look for category models',
                    productCount: response[0].length,
                    salesCount: response[1].length,
                    messageId
                });
                productModels = response[0];
                salesModels = response[1];
                var categoryModelIds = [];
                for (var i = 0; i<response[0].length; i++) {
                    categoryModelIds.push(ObjectId(response[0][i].categoryModelId));
                }
                categoryModelIds = _.uniq(categoryModelIds);
                return db.collection('CategoryModel').find({
                    _id: {
                        $in: categoryModelIds
                    }
                }).toArray();
            })
            .catch(function (error) {
                logger.error({
                    message: 'Could not find category models',
                    error,
                    messageId
                });
                return Promise.reject('Could not find category models');
            })
            .then(function (categoryModelInstances) {
                logger.debug({
                    message: 'Found category models',
                    count: categoryModelInstances.length,
                    messageId
                });
                var batch = db.collection('InventoryModel').initializeUnorderedBulkOp();

                var salesGroupedByProducts = _.groupBy(salesModels, 'productModelId');

                var batchCounter = 0, batches = [];
                _.each(productModels, function (eachProductModel, i) {

                    var totalQuantitiesSold = 0;
                    var totalQuantitiesSoldPerDate = {};
                    var totalNumberOfDaysSinceFirstSold;

                    if(eachProductModel.categoryModelId) {
                        var correspondingCategoryModel = _.find(categoryModelInstances, function (eachCategoryModel) {
                            return eachCategoryModel._id.toString() === eachProductModel.categoryModelId.toString();
                        });
                    }

                    // var correspondingCategoryModel = _.findWhere(categoryModelInstances, {_id: ObjectId(eachProductModel.categoryModelId)});

                    var productSales = salesGroupedByProducts[eachProductModel._id];

                    if (productSales) {
                        var firstSale = productSales[0].salesDate;

                        for (var j = 0, jLen = productSales.length; j<jLen; j++) {
                            firstSale = productSales[j].salesDate<firstSale ? productSales[j].salesDate : firstSale;
                            totalQuantitiesSold += productSales[j].quantity;
                            if (!totalQuantitiesSoldPerDate[productSales[j].salesDate]) {
                                totalQuantitiesSoldPerDate[productSales[j].salesDate] = productSales[j].quantity;
                            }
                            else {
                                totalQuantitiesSoldPerDate[productSales[j].salesDate] += productSales[j].quantity;
                            }
                        }

                        var millisecondsPerDay = 24 * 60 * 60 * 1000;
                        totalNumberOfDaysSinceFirstSold = Math.round((TODAYS_DATE - new Date(firstSale)) / millisecondsPerDay);
                        var averageDailyDemand = totalQuantitiesSold / totalNumberOfDaysSinceFirstSold;
                        var standardDeviation;
                        var averageMinusValueSquareSummation = 0; //sigma of (x minus x bar)^2
                        var arrayOfDatesOfSales = Object.keys(totalQuantitiesSoldPerDate);
                        for (var j = 0; j<arrayOfDatesOfSales.length; j++) {
                            averageMinusValueSquareSummation += Math.pow(totalQuantitiesSoldPerDate[arrayOfDatesOfSales[j]] - averageDailyDemand, 2);
                        }
                        for (var j = 0; j<totalNumberOfDaysSinceFirstSold - arrayOfDatesOfSales.length; j++) {
                            averageMinusValueSquareSummation += Math.pow(0 - averageDailyDemand, 2);
                        }
                        standardDeviation = Math.pow(averageMinusValueSquareSummation / totalNumberOfDaysSinceFirstSold, 0.5);
                        //tempMin is not of much use here, since we are considering a periodic replenishment system of 1 week for each store
                        var tempMin = LEAD_TIME_IN_DAYS * (averageDailyDemand + standardDeviation) + (CSL_MULTIPLIER * standardDeviation * Math.pow(LEAD_TIME_IN_DAYS, 0.5));
                        var tempMax = (LEAD_TIME_IN_DAYS + REVIEW_TIME_IN_DAYS) * (averageDailyDemand + standardDeviation) + (CSL_MULTIPLIER * standardDeviation * Math.pow((LEAD_TIME_IN_DAYS + REVIEW_TIME_IN_DAYS), 0.5));
                        var MIN, MAX, MDQ, maxShelfCapacity;
                        if (correspondingCategoryModel &&
                            correspondingCategoryModel.min &&
                            correspondingCategoryModel.min[storeModelId]>=0 &&
                            correspondingCategoryModel.max &&
                            correspondingCategoryModel.max[storeModelId]>=0) {
                            MDQ = correspondingCategoryModel.min[storeModelId];
                            maxShelfCapacity = correspondingCategoryModel.max[storeModelId];
                            MIN = MDQ>tempMin ? MDQ : tempMin;
                            MAX = (tempMax + MDQ)<maxShelfCapacity ? (tempMax + MDQ) : maxShelfCapacity;
                        }
                        else {
                            MIN = tempMin;
                            MAX = tempMax;
                        }
                        logger.debug({
                            totalQuantitiesSoldPerDate,
                            arrayOfDatesOfSales,
                            MDQ: MDQ,
                            MaxShelfCapacity: maxShelfCapacity,
                            averageMinusValueSquareSummation,
                            totalQuantitiesSold,
                            totalNumberOfDaysSinceFirstSold,
                            commandName,
                            storeModelId,
                            orgModelId,
                            correspondingCategoryModel,
                            averageDailyDemand,
                            standardDeviation,
                            productModelId: eachProductModel._id,
                            tempMax,
                            tempMin,
                            MAX,
                            MIN,
                            productNumber: (i + 1) + '/' + productModels.length,
                            productName: eachProductModel.name,
                            sku: eachProductModel.sku
                        });

                        batch.find({
                            productModelId: ObjectId(eachProductModel._id),
                            storeModelId: ObjectId(storeModelId)
                        }).update({
                            $set: {
                                averageDailyDemand: averageDailyDemand,
                                standardDeviation: standardDeviation,
                                averageDailyDemandCalculationDate: new Date(),
                                standardDeviationCalculationDate: new Date(),
                                reorder_point: MAX ? Math.round(MAX) : Math.round(tempMax), //reorder quantities to this point
                                reorder_threshold: MIN ? Math.round(MIN) : Math.round(tempMin), //reorder quantities if product below this level
                            }
                        });
                    }
                    else {
                        logger.debug({
                            message: 'There is no previous sales data available, will move on to next one',
                            product: eachProductModel._id,
                            inventoryNumber: (i + 1) + '/' + productModels.length
                        });
                        batch.find({
                            productModelId: ObjectId(eachProductModel._id),
                            storeModelId: ObjectId(storeModelId)
                        }).update({
                            $set: {
                                averageDailyDemandCalculationDate: new Date(),
                                standardDeviationCalculationDate: new Date()
                            }
                        });
                    }
                    if (batchCounter === 1000) {
                        logger.debug({
                            message: 'Executing batch of 1000 products',
                            messageId
                        });
                        batches.push(batch);
                                batchCounter = 0;
                                batch = db.collection('InventoryModel').initializeUnorderedBulkOp();
                    }
                    else {
                        batchCounter++;
                    }
                });
                return Promise.map(batches, function (eachBatch, batchNumber) {
                    logger.debug({
                        message: 'Executing batch',
                        batchNumber,
                        messageId
                    });
                    return Promise.delay(1000)
                        .then(function () {
                            return eachBatch.execute();
                        });
                })
            })
            .catch(function (error) {
                logger.error({
                    message: 'Could not update reorder points',
                    error,
                    messageId
                });
                return Promise.reject('Could not update reorder points');
            })
            .then(function (result) {
                logger.debug({
                    message: 'Calculated reorder points',
                    messageId,
                    result
                });
                return Promise.resolve('Calculated reorder points');
            });
    }
    catch (e) {
        throw new Error(e);
    }
}
