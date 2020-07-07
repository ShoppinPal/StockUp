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
TODAYS_DATE.setHours(0);
TODAYS_DATE.setMinutes(0);
TODAYS_DATE.setSeconds(0);
var runMe = function (payload, config, taskId, messageId) {

    var orgModelId = payload.orgModelId;
    var storeModelId = payload.storeModelId;
    try {
        // Global variable for logging

        logger.debug({
            commandName: commandName,
            argv: process.argv,
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

/**
 * Calculate and store min/max values for each product
 * @param orgModelId
 * @param storeModelId
 * @param messageId
 * @return {Promise.<TResult>}
 */
function calculateMinMax(orgModelId, storeModelId, messageId) {
    try {

        var productModels, salesModels, orgModelInstance, reorderPointsMultipliers;
        logger.debug({
            message: 'Will calculate min/max for the following store',
            storeModelId,
            orgModelId,
            commandName
        });
        logger.debug({
            message: 'Looking for orgModel and reorderPointsMultiplier',
            storeModelId,
            orgModelId,
            commandName
        });
        return Promise.all([
            db.collection('OrgModel').findOne({
                _id: ObjectId(orgModelId)
            }),
            /**
             * Only find multipliers with value ZERO(0), will calculate their reorder points
             * to be also ZERO(0). All other multipliers will be dealt after their product
             * SKUs have suggestedOrderQuantities in the generate-stock-order-* scripts.
             */
            db.collection('ReorderPointsMultiplierModel').find({
                $and: [{orgModelId: ObjectId(orgModelId)}, {isActive: true}, {multiplier: 0}]
            }).toArray()
        ])
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
            .then(function (response) {
                orgModelInstance = response[0];
                reorderPointsMultipliers = response[1];
                logger.debug({
                    message: 'Found orgModel and reorderMultiplier models, will look for productModels',
                    response,
                    messageId,
                    commandName,
                    orgModelId,
                    storeModelId
                });

                let distinctProductModelQuery = {
                    storeModelId: ObjectId(storeModelId)
                };

                /**
                 * If there's no need to re-calculate the reorder points for this store
                 * coz it might have been generated already today
                 */
                if (!orgModelInstance.recalculateReorderPointsEveryTime) {
                    distinctProductModelQuery = {
                        $and: [
                            {
                                storeModelId: ObjectId(storeModelId)
                            },
                            {
                                $or: [
                                    {
                                        standardDeviationCalculationDate: {
                                            $lt: TODAYS_DATE
                                        }
                                    },
                                    {
                                        salesDateRangeInDays: {
                                            $ne: orgModelInstance.salesDateRangeInDays
                                        }
                                    }
                                ]
                            }
                        ]
                    };
                }

                return db.collection('InventoryModel').distinct('productModelId', distinctProductModelQuery);
            })
            .then(function (response) {
                let productModelIds = response;
                logger.debug({
                    message: 'Found Distinct productModelIds , will fetch products and sales history',
                    orgModelInstance,
                    count: productModelIds.length,
                    commandName,
                    storeModelId,
                    orgModelId
                });

                if (productModelIds && productModelIds.length) {
                    var salesDateFrom = new Date();
                    salesDateFrom.setDate(salesDateFrom.getDate() - (orgModelInstance.salesDateRangeInDays || 30));
                    return Promise.all([
                        db.collection('ProductModel').find({
                            _id: {$in: productModelIds}
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
                                },
                                {
                                    salesDate: {
                                        $gte: salesDateFrom
                                    }
                                }
                            ]
                        }).toArray()
                    ])
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
                                message: 'Found sales and product models, will create reorder points',
                                productCount: response[0].length,
                                salesCount: response[1].length,
                                messageId
                            });
                            productModels = response[0];
                            salesModels = response[1];
                            var salesGroupedByProducts = _.groupBy(salesModels, 'productModelId');

                            if (productModels && productModels.length) {
                                let batches = createReorderPointBatches(productModels, salesGroupedByProducts, reorderPointsMultipliers, storeModelId, orgModelInstance.salesDateRangeInDays, messageId);
                                return updateReorderPoints(batches, messageId);
                            }
                            else {
                                return Promise.resolve('No reorder points to update');
                            }
                        })
                }
                else {
                    return Promise.resolve('No reorder points to update');
                }
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

/**
 * Calculate min/max for each product in the store
 * that has sales in the salesDateRange defined for the org
 * @param productModels
 * @param salesGroupedByProducts
 * @param reorderPointsMultipliers
 * @param storeModelId
 * @param salesDateRangeInDays
 * @param messageId
 * @return {Array}
 */
function createReorderPointBatches(productModels, salesGroupedByProducts, reorderPointsMultipliers, storeModelId, salesDateRangeInDays, messageId) {

    var batchCounter = 0, batches = [];

    let productSKUsWithMultipliers = {};

    _.each(reorderPointsMultipliers, function (eachMultiplier) {
        _.each(eachMultiplier.productSKUs, function (eachSKU) {
            productSKUsWithMultipliers[eachSKU] = eachMultiplier.multiplier;
        });
    });

    _.each(productModels, function (eachProductModel, i) {
        if (i % 999 === 0) {
            logger.debug({
                message: 'pushing batch',
                batchNumber: i,
                totalBatches: batches.length,
                messageId
            });
            batches.push(db.collection('InventoryModel').initializeUnorderedBulkOp());
        }
        var productSales = salesGroupedByProducts[eachProductModel._id];
        if (productSales) {
            let {
                averageDailyDemand,
                standardDeviation,
                tempMin,
                tempMax
            } = calculateProductReorderPoint(eachProductModel, productSales, messageId);

            if (productSKUsWithMultipliers.hasOwnProperty(eachProductModel.sku)) {
                logger.debug({
                    message: 'Applying multiplier to product',
                    eachProductModel,
                    multiplier: productSKUsWithMultipliers[eachProductModel.sku],
                    messageId
                });
                tempMax = tempMax * productSKUsWithMultipliers[eachProductModel.sku];
            }

            batches[batches.length - 1].find({
                productModelId: ObjectId(eachProductModel._id),
                storeModelId: ObjectId(storeModelId)
            }).update({
                $set: {
                    averageDailyDemand: averageDailyDemand,
                    standardDeviation: standardDeviation,
                    averageDailyDemandCalculationDate: new Date(),
                    standardDeviationCalculationDate: new Date(),
                    salesDateRangeInDays: salesDateRangeInDays,
                    stockUpReorderPoint: Math.round(tempMax), //reorder quantities to this point
                    stockUpReorderThreshold: Math.round(tempMin), //reorder quantities if product below this level
                }
            });
        }
        else {
            batches[batches.length - 1].find({
                productModelId: ObjectId(eachProductModel._id),
                storeModelId: ObjectId(storeModelId)
            }).update({
                $set: {
                    averageDailyDemand: null,
                    standardDeviation: null,
                    stockUpReorderPoint: null,
                    stockUpReorderThreshold: null,
                    salesDateRangeInDays: salesDateRangeInDays,
                    averageDailyDemandCalculationDate: new Date(),
                    standardDeviationCalculationDate: new Date()
                }
            });
        }
    });
    return batches;
}

/**
 * Update reorder points for each batch of products
 * @param batches
 * @return {*}
 */
function updateReorderPoints(batches, messageId) {
    return Promise.map(batches, function (eachBatch, batchNumber) {
        logger.debug({
            message: 'Executing batch',
            batchNumber,
            messageId
        });
        return eachBatch.execute();
    }, {concurrency: 1});

}

/**
 * Calculate averageDailyDemand, standardDeviation, Min & Max for
 * each product based on its sales
 * @param eachProductModel
 * @param categoryModelInstances
 * @param productSales
 * @param messageId
 * @return {{averageDailyDemand: number, standardDeviation: (number|*), tempMin: number, tempMax: number}}
 */
function calculateProductReorderPoint(eachProductModel, productSales, messageId) {
    var totalQuantitiesSold = 0;
    var totalQuantitiesSoldPerDate = {};
    var totalNumberOfDaysSinceFirstSold;

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
    totalNumberOfDaysSinceFirstSold = Math.round((TODAYS_DATE - new Date(firstSale)) / millisecondsPerDay) || 1;
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
    //TODO: need to take the periodic interval into account in tempMax
    var tempMin = LEAD_TIME_IN_DAYS * (averageDailyDemand + standardDeviation) + (CSL_MULTIPLIER * standardDeviation * Math.pow(LEAD_TIME_IN_DAYS, 0.5));
    var tempMax = (LEAD_TIME_IN_DAYS + REVIEW_TIME_IN_DAYS) * (averageDailyDemand + standardDeviation) + (CSL_MULTIPLIER * standardDeviation * Math.pow((LEAD_TIME_IN_DAYS + REVIEW_TIME_IN_DAYS), 0.5));
    logger.debug({
        totalQuantitiesSoldPerDate,
        arrayOfDatesOfSales,
        averageMinusValueSquareSummation,
        totalQuantitiesSold,
        totalNumberOfDaysSinceFirstSold,
        commandName,
        averageDailyDemand,
        standardDeviation,
        productModelId: eachProductModel._id,
        tempMax,
        tempMin,
        productName: eachProductModel.name,
        sku: eachProductModel.sku,
        messageId
    });
    return {
        averageDailyDemand,
        standardDeviation,
        tempMin,
        tempMax
    };
}
