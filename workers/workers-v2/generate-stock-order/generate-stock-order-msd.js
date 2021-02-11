const logger = require('sp-json-logger')();
const sql = require('mssql');
const dbUrl = process.env.DB_URL;
const MongoClient = require('mongodb').MongoClient;
const ObjectId = require('mongodb').ObjectID;
var db = null; //database connected
const utils = require('./../../jobs/utils/utils.js');
const queries = require('../../utils/queries');
const path = require('path');
sql.Promise = require('bluebird');
const _ = require('underscore');
const Promise = require('bluebird');
const commandName = path.basename(__filename, '.js'); // gives the filename without the .js extension
const TODAYS_DATE = new Date();
const rp = require('request-promise');
const REPORT_STATES = utils.REPORT_STATES;

/**
 * An optionLevel is a combination of products with VPN > Color > Shade
 * Need to find out Reorder points at option level
 * So, let's create options levels with keys as "VPN-Color-Shade"
 * For example:
 *  '30782-Pink-Dark'
 */

/**
 * Run the main function.
 * @param payload
 * @param config
 * @param taskId
 * @param messageId
 * @return {Promise.<T>}
 */
var runMe = function (payload, config, taskId, messageId) {

    var orgModelId = payload.orgModelId;
    var storeModelId = payload.storeModelId;
    try {
        logger.debug({
            commandName: commandName,
            argv: process.argv,
            orgModelId,
            storeModelId,
            messageId
        });
        try {
            logger.debug({
                commandName: commandName,
                message: 'This worker will generate a stock order for the given store',
                orgModelId,
                storeModelId,
                messageId
            });
            return Promise.resolve()
                .then(function () {
                    logger.debug({
                        message: 'Will connect to Mongo DB',
                        commandName,
                        messageId
                    });
                    return MongoClient.connect(dbUrl, {promiseLibrary: Promise});
                })
                .catch(function (error) {
                    logger.error({
                        message: 'Could not connect to Mongo DB',
                        error,
                        commandName,
                        messageId
                    });
                    return Promise.reject('Could not connect to Mongo DB');
                })
                .then(function (dbInstance) {
                    db = dbInstance;
                    logger.debug({
                        message: 'Connected to Mongo DB',
                        commandName,
                        messageId
                    });
                    return generateStockOrder(payload, config, taskId, messageId);
                })
                .catch(function (error) {
                    return sendErrorNotification(payload, error, taskId, messageId);
                })
                .then(function (result) {
                    var options = {
                        method: 'POST',
                        uri: utils.PUBLISH_URL,
                        json: true,
                        headers: {
                            'Authorization': payload.loopbackAccessToken.id
                        },
                        body: new utils.Notification(
                            utils.workerType.GENERATE_STOCK_ORDER_MSD,
                            payload.eventType,
                            utils.workerStatus.SUCCESS,
                            {success: true, reportModelId: payload.reportModelId},
                            payload.callId
                        )
                    };
                    logger.debug({
                        commandName: commandName,
                        message: 'Generated stock order, will send the status to worker',
                        result,
                        messageId,
                        options
                    });
                    return rp(options);
                })
                .catch(function (error) {
                    logger.error({
                        message: 'Could not send status to server',
                        error,
                        commandName,
                        messageId
                    });
                    return Promise.reject('Could not send status to server')
                })
                .then(function (res) {
                    logger.debug({
                        message: 'Successfully sent worker status to server',
                        res,
                        commandName,
                        messageId
                    });
                    return Promise.resolve('Successfully sent worker status to server');
                })
                .finally(function () {
                    logger.debug({
                        commandName: commandName,
                        message: 'Closing database connection',
                        messageId
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
                        err: error,
                        messageId
                    });
                    return Promise.resolve();
                    //TODO: set a timeout, after which close all listeners
                });
        }
        catch (e) {
            logger.error({
                commandName: commandName, message: '2nd last catch block', err: e,
                messageId
            });
            throw e;
        }
    }
    catch (e) {
        logger.error({
            message: 'last catch block', err: e,
            messageId
        });
        throw e;
    }
};


module.exports = {
    run: runMe
};

/**
 * Generate stock order and insert line items
 * @param payload
 * @param config
 * @param taskId
 * @param messageId
 * @return {Promise.<TResult>}
 */
function generateStockOrder(payload, config, taskId, messageId) {
    var orgModelId = payload.orgModelId;
    var storeModelId = payload.storeModelId;
    var warehouseModelId = payload.warehouseModelId;
    var categoryModelId = payload.categoryModelId;
    var optionLevelStoreInventory, productModelIds;
    //TODO: Size-wise replacements (replace size S with M in order if S is not available)
    logger.debug({
        message: 'Will generate stock order for the following store',
        storeModelId,
        orgModelId,
        commandName,
        messageId
    });
    logger.debug({
        message: 'Looking for store in database',
        storeModelId,
        orgModelId,
        commandName,
        messageId
    });
    var reportModel, totalRows, optionLevelWarehouseInventory;
    return db.collection('StoreModel').findOne({
        _id: ObjectId(storeModelId)
    })
        .catch(function (error) {
            logger.error({
                message: 'Could not find a store with this id',
                storeModelId,
                error,
                commandName,
                messageId
            });
            return Promise.reject('Could not find a store with this id');
        })
        .then(function (storeModelInstance) {
            return createReportModel(payload, storeModelInstance, messageId);
        })
        .then(function (result) {
            reportModel = result.ops[0];
            logger.debug({
                message: 'Created report model instance for store, will generate new reorder points',
                result,
                commandName,
                messageId
            });
            var generateReorderPoints = require('./../generate-reorder-points/generate-reorder-points');
            return generateReorderPoints.run(payload, config, taskId, messageId);
        })
        .then(function (result) {
            logger.debug({
                message: 'Created reorder points for store, will find its inventory models',
                result,
                commandName,
                messageId
            });
            return findStoreInventoryToReplenish(storeModelId, categoryModelId, messageId)
        })
        .then(function (inventoryModelInstances) {
            logger.debug({
                message: 'Found option level inventory model instances with their category data and combined reorder values, will look for warehouse inventory',
                sampleInventoryModelInstance: _.sample(inventoryModelInstances),
                toReplenishItemCount: inventoryModelInstances.length,
                orgModelId,
                messageId
            });
            let productModelIds = _.chain(inventoryModelInstances).pluck('productModels').flatten().pluck('productModelId').value();
            optionLevelStoreInventory = _.indexBy(inventoryModelInstances, function (eachInventory) {
                return eachInventory._id;  //here _id is the $optionLevelKey as configured in findStoreInventoryToReplenish()
            });
            return queries.findWarehouseInventory(warehouseModelId, productModelIds, db);
        })
        .catch(function (error) {
            logger.error({
                message: 'Could not find the inventory model instances of the warehouse, will exit',
                error,
                commandName,
                orgModelId,
                storeModelId,
                messageId
            });
            return Promise.reject(error);
        })
        .then(function (inventoryModelInstances) {
            logger.debug({
                message: 'Found inventory model instances of products in warehouse',
                count: inventoryModelInstances.length,
                commandName,
                messageId,
                inventoryModelInstances: _.sample(inventoryModelInstances)
            });

            optionLevelWarehouseInventory = _.indexBy(inventoryModelInstances, function (eachInventory) {
                return eachInventory._id;
            });
            let allLineItems = generateOrderQuantities(reportModel, storeModelId, orgModelId, optionLevelStoreInventory, optionLevelWarehouseInventory, messageId);
            let lineItemsToOrder = allLineItems.lineItemsToOrder;
            let totalRows = lineItemsToOrder.length;
            if (totalRows) {
                let warehouseInventoryByProduct = _.flatten(_.pluck(optionLevelWarehouseInventory, 'productModels'));
                return optimiseQuantitiesByStorePriority(lineItemsToOrder, warehouseInventoryByProduct, storeModelId, orgModelId, messageId);
            }
            else {
                return Promise.resolve('No items to order');
            }
        })
        .catch(function (error) {
            logger.debug({
                message: 'Could not insert line items to report model',
                error,
                reason: error,
                commandName,
                messageId
            });
            return Promise.resolve('ERROR_REPORT'); //TODO: why resolve promise here? There was no alert when the job failed
        })
        .then(function (result) {
            if (result === 'ERROR_REPORT') {
                logger.debug({
                    message: 'Will update report model with error',
                    result,
                    commandName,
                    messageId
                });
                return Promise.all([
                    db.collection('ReportModel').updateOne({
                        _id: ObjectId(reportModel._id)
                    }, {
                        $set: {
                            state: REPORT_STATES.PROCESSING_FAILURE,
                            totalRows: totalRows
                        }
                    }), result]);
            }
            else {
                logger.debug({
                    message: 'Inserted items into report model successfully, and updated quantities in other reports. Will update report model',
                    result,
                    commandName,
                    messageId
                });
                return Promise.all([
                    db.collection('ReportModel').updateOne({
                        _id: ObjectId(reportModel._id)
                    }, {
                        $set: {
                            state: REPORT_STATES.GENERATED
                        }
                    })]);
            }
        }).then(function ([updateResult, result]) {
            if (result === 'ERROR_REPORT') {
                return Promise.reject('Error while processing order');
            } else {
                return Promise.resolve();
            }
        });
}

/**
 * If other stores have already ordered same line items in the same day,
 * then need to distribute their order quantities among each other
 * based on warehouse stock
 * @param lineItemsToOrder
 * @param warehouseInventory
 * @param storeModelId
 * @param orgModelId
 * @param messageId
 * @return {Promise.<TResult>}
 */
function optimiseQuantitiesByStorePriority(lineItemsToOrder, warehouseInventory, storeModelId, orgModelId, messageId) {
    return findAlreadyOrderedLineItemsToday(warehouseInventory, lineItemsToOrder, orgModelId, storeModelId, messageId)
        .then(function (alreadyOrderedLineItems) {
            logger.debug({
                message: 'These items already exist on another order generated today for another store',
                count: alreadyOrderedLineItems.length,
                commandName,
                messageId
            });
            /**
             * Let's group together all line items from all orders today
             * to do a fair distribution of quantities to all stores
             * according to their corresponding sales and limited warehouse availability
             */
            var combinedLineItems = _.union(alreadyOrderedLineItems, lineItemsToOrder);
            var sameSKUsGrouped = _.groupBy(combinedLineItems, 'productModelId');
            /**
             * Need to do distribution only if there have been no other orders today.
             * otherwise SKIP
             */
            if (alreadyOrderedLineItems.length) {
                logger.debug({
                    message: 'Will change the order quantities to accommodate deficit in warehouse inventory',
                    commandName,
                    messageId
                });
                var groupedProductModelIDs = Object.keys(sameSKUsGrouped);
                for (var i = 0; i < groupedProductModelIDs.length; i++) {

                    let warehouseStock = warehouseInventory[groupedProductModelIDs[i]];

                    if (warehouseStock && warehouseStock.inventory_level) {
                        sameSKUsGrouped[groupedProductModelIDs[i]] = distributeByWarehouseAvailability(sameSKUsGrouped[groupedProductModelIDs[i]], warehouseStock.inventory_level, messageId);
                    }
                }
            }
            logger.debug({
                sameSKUSGrouped: _.sample(sameSKUsGrouped)
            });
            return saveLineItems(sameSKUsGrouped, messageId);
        });

}

/**
 *
 * Distribute the quantities now by ratio of their original order quantities.
 * For example,
 *
 * Store A orderQuantity: 10
 * Store B orderQuantity: 10
 * Warehouse stock: 15
 *
 * then,
 *
 * Store A newOrderQuantity: ~7.5
 * Store B newOrderQuantity: ~7.5
 *
 * @param products
 * @param warehouseInventory
 * @param messageId
 * @return {*}
 */
function distributeByWarehouseAvailability(products, warehouseInventory, messageId) {

    /**
     * Find out the total quantities of each product order by all stores combined
     * @type {*}
     */
    var currentTotalQuantities = _.reduce(products, function (memo, num) {
        return memo + num.originalOrderQuantity;
    }, 0);

    logger.debug({
        totalQuantitiesOrderedByAllStores: currentTotalQuantities,
        warehouseInventory: warehouseInventory,
        products,
        messageId,
        commandName
    });
    /**
     * Do the distribution of order quantities only if warehouse cannot supply
     * the demands of all stores due to limited availability of stock in warehouse.
     * If warehouse has enough to supply to all stores, then keep going.
     */
    if (warehouseInventory && currentTotalQuantities > warehouseInventory) {
        let newTotalQuantities = 0;

        /**
         * Distribute quantities by ratio of original order quantities for each store
         * vs warehouse inventory available
         */
        _.each(products, function (eachSKU) {
            let newOrderQuantity = (eachSKU.originalOrderQuantity / currentTotalQuantities) * warehouseInventory;
            eachSKU.orderQuantity = Math.round(newOrderQuantity);
            eachSKU.roundedBy = eachSKU.orderQuantity - newOrderQuantity;
            newTotalQuantities += eachSKU.orderQuantity;
        });
        let productsSortedByRoundOffs = _.sortBy(products, 'roundedBy');

        /**
         * if totalQuantities now goes above warehouseInventory,
         * then bring it down to warehouseInventory. For example,
         * quantities: 2.6, 2.6, 1.5
         * roundedQuantities: 3, 3, 2
         * current warehouseInventory: 6
         * current totalOrderQuantity: 8
         * get most rounded: 1.5 ---> 2
         * decrease it from 2 to 1
         * follow similar method for other products until total quantity
         * comes down to equal warehouseInventory
         */
        if (newTotalQuantities > warehouseInventory) {

            let totalSurplus = newTotalQuantities - warehouseInventory;
            for (let i = productsSortedByRoundOffs.length - 1; i >= 0, totalSurplus != 0; i--) {
                productsSortedByRoundOffs[i].orderQuantity--;
                totalSurplus--;
            }
        }


        /**
         * if totalQuantities now goes below warehouseInventory,
         * then bring it upto min. For example,
         * quantities: 2.4, 2.4, 1.2
         * roundedQuantities: 2, 2, 1
         * defined warehouseInventory: 6
         * current totalOrderQuantity: 5
         * get highest rounded: 2.4 ---> 2
         * increase it from 2 to 3
         * follow same for other products
         */
        /*if (totalQuantity<warehouseInventory) {
         let totalDeficit = warehouseInventory - totalQuantity;
         for (let i = 0; i<productsSortedByRoundOffs.length, totalDeficit != 0; i++) {
         productsSortedByRoundOffs[i].orderQuantity++;
         totalDeficit--;
         }
         }*/
        /**
         * return the array with new rounded off quantities
         */
        return productsSortedByRoundOffs;
    }
    else {
        return products;
    }

}

/**
 * Create a report model for reference to the order
 * @param payload
 * @param storeModelInstance
 * @param messageId
 * @return {Promise.<TResult>}
 */
function createReportModel(payload, storeModelInstance, messageId) {
    return Promise.resolve()
        .then(function () {
            logger.debug({
                message: 'Found store, will create a report model',
                storeModelInstance,
                commandName,
                messageId
            });
            var name;
            if (!payload.name) {
                name = storeModelInstance.name + ' - ' + TODAYS_DATE.getFullYear() + '-' + (TODAYS_DATE.getMonth() + 1) + '-' + TODAYS_DATE.getDate();
            }
            if (!payload.reportModelId) {
                return db.collection('ReportModel').insert({
                    name: name,
                    orgModelId: ObjectId(orgModelId),
                    userModelId: ObjectId(payload.loopbackAccessToken.userId), // explicitly setup the foreignKeys for related models
                    storeModelId: ObjectId(storeModelId),
                    categoryModelId: ObjectId(categoryModelId),
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    state: REPORT_STATES.PROCESSING,
                    deliverFromStoreModelId: ObjectId(payload.warehouseModelId),
                    percentagePushedToMSD: 0,
                    transferOrderNumber: null,
                    transferOrderCount: 0
                });
            }
            else {
                return Promise.resolve({
                    ops: [
                        {
                            _id: payload.reportModelId
                        }
                    ]
                });
            }
        })
        .catch(function (error) {
            logger.error({
                error,
                message: 'Could not create report model for this store',
                storeModelId,
                commandName,
                messageId
            });
            return Promise.reject('Could not create report model for this store');
        });
}

/**
 * Find store inventory that needs replenishment,
 * based on option-level
 * @param storeModelId
 * @param categoryModelId
 * @param messageId
 * @return {Promise.<TResult>}
 */
function findStoreInventoryToReplenish(storeModelId, categoryModelId, messageId) {
    return Promise.resolve()
        .then(function () {
            if (categoryModelId) {
                return db.collection('ProductModel').find({
                    categoryModelId: ObjectId(categoryModelId)
                }).toArray();
            }
            else {
                return Promise.resolve([]);
            }
        })
        .then(function (result) {
            logger.debug({
                message: 'Found products by category model',
                count: result.length || 'No category selected',
                commandName,
                messageId
            });
            return queries.getAggregatedStoreInventory(storeModelId, db);
        })
        .catch(function (error) {
            logger.error({
                message: 'Could not find the inventory model instances of the store, will exit',
                error,
                commandName,
                storeModelId,
                messageId
            });
            return Promise.reject(error);
        });
}

/**
 * Generate order quantities based on reorder points & warehouse availability
 * @param reportModel
 * @param storeModelId
 * @param orgModelId
 * @param optionLevelStoreInventory
 * @param optionLevelWarehouseInventory
 * @param messageId
 * @return {{lineItemsToOrder: Array, skippedLineItems: Array}}
 */
function generateOrderQuantities(reportModel, storeModelId, orgModelId, optionLevelStoreInventory, optionLevelWarehouseInventory, messageId) {

    try {
        var skippedLineItems = [], lineItemsToOrder = [], skip1 = 0, skip2 = 0, skip3 = 0;
        _.each(optionLevelStoreInventory, function (optionInventory, optionKey) {
            /**
             * If warehouse doesn't have inventory for any optionLevel item,
             * then SKIP it.
             */
            if (!(optionLevelWarehouseInventory[optionKey] && optionLevelWarehouseInventory[optionKey].inventory_level)) {
                skippedLineItems.push(optionLevelStoreInventory[optionKey]);
                skip1++;
            }
            /**
             * Only continue if warehouse has inventory for the selected optionLevel item
             */
            else {
                var optionOrderQuantity;
                var optionCategoryModel = optionInventory.categoryModel[0];
                var MAX;

                MAX = optionInventory.categoryMax || optionInventory.reorder_point;

                logger.debug({
                    max: MAX,
                    storeInventory: optionInventory.inventory_level,
                    optionInventory,
                    optionKey
                });


                /**
                 * Let's find the orderQuantity at option level now
                 * by decreasing the quantity already present in store
                 */
                var storeQuantityOnHand = optionInventory.inventory_level;
                if (storeQuantityOnHand > 0)
                    optionOrderQuantity = MAX - storeQuantityOnHand;
                else
                    optionOrderQuantity = MAX;

                /**
                 * TODO: optionOrderQuantity could be (-ve) in some cases,
                 * need to find out the cases. Right now let's deal with
                 * only (+ve) order quantities
                 */
                if (optionOrderQuantity > 0) {
                    _.each(optionInventory.productModels, function (eachProduct, index) {

                        /**
                         * Rationalise the reorder point of each item in optionLevel
                         * to meet the required order quantity and checking
                         * if the required order quantity is available in warehouse.
                         * This could be in decimals, which we will roundOff later on
                         * to avoid multiple roundOffs and maintain accuracy.
                         *
                         * Also consider inventory as 0 if it's negative.
                         * TODO: to consider/leave -ve inventory option should go as an option in UI
                         */
                        var productSuggestedOrderQuantity = ((eachProduct.reorder_point / optionInventory.reorder_point) * optionOrderQuantity);

                        /**
                         * Check product reorderPointsMultipliers and generate suggestedOrderQuantity based on that
                         */
                        if (eachProduct.hasOwnProperty('multiplier') && eachProduct.multiplier !== null) {
                            productSuggestedOrderQuantity *= eachProduct.multiplier;
                        }

                        var productInventory = eachProduct.inventory_level >= 0 ? eachProduct.inventory_level : 0; //treating negative store inventory as ZERO for now
                        // var productOrderQuantity = productSuggestedOrderQuantity - productInventory;
                        var warehouseInventory = _.find(optionLevelWarehouseInventory[optionKey].productModels, function (eachWarehouseProduct) {
                            return eachProduct.productModelId.toString() === eachWarehouseProduct.productModelId.toString();
                        });
                        var warehouseQuantity = warehouseInventory ? warehouseInventory.inventory_level : 0;
                        /**
                         * Don't order more than what's available in warehouse
                         */
                        var productOrderQuantity = warehouseQuantity > productSuggestedOrderQuantity ? productSuggestedOrderQuantity : warehouseQuantity;

                        logger.debug({
                            eachProduct,
                            productSuggestedOrderQuantity,
                            productInventory,
                            warehouseInventory,
                            productOrderQuantity,
                            warehouseQuantity
                        });
                        /**
                         * Products with only (+ve) orderQuantity should be ordered.
                         * Need to push categoryDetails to help UI in sorting by category.
                         */
                        if (productOrderQuantity > 0) {
                            lineItemsToOrder.push({
                                reportModelId: ObjectId(reportModel._id),
                                productModelId: ObjectId(eachProduct.productModelId),
                                storeModelId: ObjectId(storeModelId),
                                orgModelId: ObjectId(orgModelId),
                                orderQuantity: Math.round(productOrderQuantity),
                                storeInventory: eachProduct.inventory_level,
                                warehouseInventory: warehouseQuantity,
                                originalOrderQuantity: Math.round(productOrderQuantity),
                                categoryModelId: optionCategoryModel ? ObjectId(optionCategoryModel._id) : '',
                                categoryModelName: optionCategoryModel ? optionCategoryModel.name : '',  //need for sorting in UI, DO NOT REMOVE
                                fulfilledQuantity: 0,
                                receivedQuantity: 0,
                                fulfilled: null,
                                received: false,
                                state: 'unboxed',
                                approved: null,
                                createdAt: new Date(),
                                updatedAt: new Date()
                            });
                        }
                        else {
                            skip3++;
                        }
                    });
                }
                /**
                 * Skip the optionLevel items that have (-ve) order quantities
                 */
                else {
                    logger.debug({
                        message: 'This has negative option order quantity',
                        optionKey,
                        optionOrderQuantity,
                        messageId
                    });
                    skippedLineItems.push(optionLevelStoreInventory[optionKey]);
                    skip2++;
                }
            }

        });
        logger.debug({
            message: 'Could not find a corresponding inventory for product in warehouse, will skip these many items',
            count: skippedLineItems.length,
            commandName,
            messageId
        });
        logger.debug({
            message: 'Prepared to push these items to stock order',
            count: lineItemsToOrder.length,
            commandName,
            warehouseInventoryNotFound: skip1,
            orderQuantityNegative: skip2,
            productOrderQuantityNegatice: skip3,
            messageId
        });
        return {
            lineItemsToOrder,
            skippedLineItems
        };
    }
    catch (err) {
        logger.error({
            message: 'Could not generate stock order',
            err,
            reason: err,
            messageId,
            commandName
        });
        throw new err;
    }
}

/**
 * Find stock order line items that have already been ordered by other stores today.
 * Keep in mind to not include the ones that have already been pushed to MSD and have
 * a transferOrderNumber assigned to them.
 * @param warehouseInventory
 * @param lineItemsToOrder
 * @param messageId
 * @return {Promise.<TResult>}
 */
function findAlreadyOrderedLineItemsToday(warehouseInventory, lineItemsToOrder, orgModelId, storeModelId, messageId) {
    logger.debug({
        message: 'Will look for same SKUs ordered today for other stores',
        sampleWarehouseInventory: _.sample(warehouseInventory),
        sampleLineItemsToOrder: _.sample(lineItemsToOrder),
        commandName,
        messageId
    });
    var todaysDate = new Date();
    todaysDate.setHours(0, 0, 0, 0);
    //look for any latest report models from other stores generated today
    var aggregateQuery = [
        {
            $match: {
                $and: [
                    {
                        created: {
                            $gte: todaysDate
                        }
                    },
                    {
                        orgModelId: ObjectId(orgModelId)
                    },
                    {
                        storeModelId: {
                            $ne: ObjectId(storeModelId)
                        }
                    },
                    {
                        transferOrderNumber: {
                            $exists: false
                        }
                    }
                ]
            }
        },
        {
            $sort: {
                created: -1
            }
        },
        {
            $group: {
                _id: '$storeModelId',
                reportModelId: {$first: '$_id'}
            }
        }
    ];
    return db.collection('ReportModel').aggregate(aggregateQuery).toArray()
        .catch(function (error) {
            logger.error({
                message: 'Error fetching other report models generated today',
                error,
                messageId
            });
            return Promise.reject('Error fetching other report models generated today');
        })
        .then(function (reportModelInstances) {
            logger.debug({
                message: 'Found these latest report models generated today, will look for same items ordered in them',
                reportModelInstances,
                messageId
            });
            var reportModelIds = _.pluck(reportModelInstances, 'reportModelId');
            var filter = {
                $and: [
                    {
                        productModelId: {
                            $in: _.pluck(lineItemsToOrder, 'productModelId')
                        }
                    },
                    {
                        reportModelId: {
                            $in: reportModelIds
                        }
                    }
                ]
            };
            return db.collection('StockOrderLineitemModel').find(filter).toArray()
        })
        .catch(function (error) {
            logger.error({
                message: 'Could not find same SKUs ordered today for other stores',
                commandName,
                error,
                messageId
            });
            return Promise.reject('Could not find same SKUs ordered today for other stores');
        });
}

/**
 * Save LineItems in Bulk to their respective orders
 * @param sameSKUsGrouped
 * @param messageId
 * @return {Promise.<T>}
 */
function saveLineItems(sameSKUsGrouped, messageId) {
    var batch = db.collection('StockOrderLineitemModel').initializeUnorderedBulkOp();
    _.each(_.flatten(_.values(sameSKUsGrouped), true), function (eachLineItem) {
        logger.debug({
            eachLineItem
        });
        if (eachLineItem._id) {
            if (eachLineItem.orderQuantity) {
                batch.find({
                    _id: eachLineItem._id
                }).upsert().updateOne({
                    $set: {
                        orderQuantity: eachLineItem.orderQuantity,
                        updatedAt: new Date(),
                        roundedBy: eachLineItem.roundedBy
                    }
                });
            }
            else {
                batch.find({
                    _id: eachLineItem._id
                }).remove({
                    _id: eachLineItem._id
                });
            }
        }
        else {
            if (eachLineItem.orderQuantity) {
                batch.insert(eachLineItem);
            }
        }
    });
    return batch.execute()
        .catch(function (error) {
            logger.error({
                message: 'Could not optimise order quantities',
                error,
                commandName,
                messageId
            });
            return Promise.reject('Could not optimise order quantities');
        });
}

function sendErrorNotification(payload, error, taskId, messageId) {
    logger.error({
        commandName: commandName,
        message: 'Could not generate stock order, will send the following status',
        err: error,
        messageId
    });
    var options = {
        method: 'POST',
        uri: utils.PUBLISH_URL,
        json: true,
        headers: {
            'Authorization': payload.loopbackAccessToken.id
        },
        body: new utils.Notification(
            utils.workerType.GENERATE_STOCK_ORDER_MSD,
            payload.eventType,
            utils.workerStatus.FAILED,
            {success: false, reportModelId: payload.reportModelId},
            payload.callId
        )

    };
    logger.debug({
        message: 'Could not insert line items to report model, will send the following error',
        error,
        options,
        commandName,
        messageId
    });
    var slackMessage = 'Generate stock order MSD Worker failed for storeModelId ' + payload.storeModelId +
        '\n taskId' + ': ' + taskId +
        '\n MessageId: ' + messageId +
        '\n orgModelId: '+ payload.orgModelId +
        '\n storeModelId: ' + payload.storeModelId +
        '\n Environment: '+ process.env.APP_HOST_NAME;
    utils.sendSlackMessage('Worker failed', slackMessage, false);
    return rp(options)
        .then(function (response) {
            logger.debug({
                message: 'Send notification successfully, will continue throwing error',
                response,
                messageId,
                commandName
            });
            return Promise.reject();
        });
}
