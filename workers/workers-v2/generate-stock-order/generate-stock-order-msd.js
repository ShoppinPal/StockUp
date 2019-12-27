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
const TODAYS_DATE = new Date();
const rp = require('request-promise');
const REPORT_STATES = utils.REPORT_STATES;
/**
 * One option is a combination of products with VPN > Color > Shade
 * Need to find out Reorder points at option level
 * So, let's create options levels with keys as "VPN-Color-Shade"
 * For example:
 *  '30782-Pink-Dark'
 */
var runMe = function (payload, config, taskId, messageId) {

    var orgModelId = payload.orgModelId;
    var storeModelId = payload.storeModelId;
    try {
        // Global variable for logging

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
                .then(function (pool) {
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
                    var slackMessage = 'Generate stock order MSD Worker failed for storeModelId ' + storeModelId + '\n taskId' +
                        ': ' + taskId + '\nMessageId: ' + messageId;
                    utils.sendSlackMessage('Worker failed', slackMessage, false);
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

function generateStockOrder(payload, config, taskId, messageId) {
    var orgModelId = payload.orgModelId;
    var storeModelId = payload.storeModelId;
    var warehouseModelId = payload.warehouseModelId;
    var categoryModelId = payload.categoryModelId;
    var optionLevelStoreInventory, productModelIds;
    //TODO: Size-wise replacements (replace size S with M in order if S is not available)
    var sizeReplacementArray = [
        {
            size: 'S',
            replacement: 'M'
        },
        {
            size: 'M',
            replacement: 'S'
        },
        {
            size: 'L',
            replacement: 'M'
        },
        {
            size: 'XS',
            replacement: 'S'
        },
        {
            size: 'XL',
            replacement: 'L'
        }
    ];
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
    var reportModel, totalRows, lineItemsToOrder = [], optionLevelWarehouseInventory;
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
            }else {
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
        })
        .then(function (result) {
            reportModel = result.ops[0];
            logger.debug({
                message: 'Created report model instance for store, will generate new reorder points',
                result,
                commandName,
                messageId
            });
            var generateReorderPointsMSD = require('./../generate-reorder-points/generate-reorder-points-msd');
            return generateReorderPointsMSD.run(payload, config, taskId, messageId);
        })
        .then(function (result) {
            logger.debug({
                message: 'Created reorder points for store, will find its inventory models',
                result,
                commandName,
                messageId
            });
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
            var aggregationQuery = [
                {
                    $match: {
                        storeModelId: ObjectId(storeModelId)
                    }
                },
                {
                    $lookup: {
                        "from": "CategoryModel",
                        "localField": "categoryModelId",
                        "foreignField": "_id",
                        "as": "categoryModel"
                    }
                },
                {
                    $group: {
                        _id: '$optionLevelKey',
                        totalProducts: {
                            $sum: 1
                        },
                        productModels: {
                            $addToSet: {
                                productModelId: '$productModelId',
                                inventory_level: '$inventory_level',
                                reorder_point: '$reorder_point',
                                reorder_threshold: '$reorder_threshold'
                            }
                        },
                        inventory_level: {
                            $sum: '$inventory_level'
                        },
                        reorder_point: {
                            $sum: '$reorder_point'
                        },
                        reorder_threshold: {
                            $sum: '$reorder_threshold'
                        },
                        categoryModel: {
                            $first: '$categoryModel'
                        }
                    }
                },
                {
                    $project: {
                        to_replenish: {
                            $and: [
                                {$gt: ['$reorder_threshold', '$inventory_level']},
                                {$gt: ['$reorder_threshold', 0]}
                            ]
                        },
                        optionLevelKey: '$_id',
                        totalProducts: '$totalProducts',
                        productModels: '$productModels',
                        inventory_level: '$inventory_level',
                        reorder_point: '$reorder_point',
                        reorder_threshold: '$reorder_threshold',
                        categoryModel: '$categoryModel'

                    }
                },
                {
                    $match: {
                        to_replenish: true
                    }
                }
            ];
            return db.collection('InventoryModel').aggregate(aggregationQuery).toArray();
        })
        .catch(function (error) {
            logger.error({
                message: 'Could not find the inventory model instances of the store, will exit',
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
                message: 'Found option level inventory model instances with their category data and combined reorder values, will look for warehouse inventory',
                sampleInventoryModelInstance: _.sample(inventoryModelInstances),
                toReplenishItemCount: inventoryModelInstances.length,
                orgModelId,
                messageId
            });
            optionLevelStoreInventory = _.indexBy(inventoryModelInstances, function (eachInventory) {
                return eachInventory._id;
            });
            var aggregationQuery = [
                {
                    $match: {
                        storeModelId: ObjectId(warehouseModelId)
                    }
                },
                {
                    $group: {
                        _id: '$optionLevelKey',
                        inventory_level: {
                            $sum: '$inventory_level'
                        },
                        totalProducts: {
                            $sum: 1
                        },
                        productModels: {
                            $addToSet: {
                                productModelId: '$productModelId',
                                inventory_level: '$inventory_level',
                                reorder_point: '$reorder_point',
                                reorder_threshold: '$reorder_threshold'
                            }
                        },
                    }
                },
                {
                    $match: {
                        inventory_level: {
                            $gt: 0
                        }
                    }
                }
            ];
            return db.collection('InventoryModel').aggregate(aggregationQuery).toArray();
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
                payload,
                inventoryModelInstances: _.sample(inventoryModelInstances)
            });
            try {
                optionLevelWarehouseInventory = _.indexBy(inventoryModelInstances, function (eachInventory) {
                    return eachInventory._id;
                });
                var skippedLineItems = [];
                _.each(optionLevelStoreInventory, function (optionInventory, optionKey) {

                        if (!(optionLevelWarehouseInventory[optionKey] && optionLevelWarehouseInventory[optionKey].inventory_level)) {
                            skippedLineItems.push(optionLevelStoreInventory[optionKey]);
                        }
                        else {
                            // var warehouseQuantityOnHand = optionLevelWarehouseInventory[optionKey].inventory_level;
                            var optionOrderQuantity;
                            var optionCategoryModel = optionInventory.categoryModel[0];
                            var MAX, MDQ, maxShelfCapacity;
                            if (optionCategoryModel &&
                                optionCategoryModel.min &&
                                optionCategoryModel.min[storeModelId]>=0 &&
                                optionCategoryModel.max &&
                                optionCategoryModel.max[storeModelId]>=0) {
                                MDQ = optionCategoryModel.min[storeModelId];
                                maxShelfCapacity = optionCategoryModel.max[storeModelId];
                                MAX = (optionInventory.reorder_point + MDQ)<maxShelfCapacity ? (optionInventory.reorder_point + MDQ) : maxShelfCapacity;
                            }
                            else {
                                MAX = optionInventory.reorder_point;
                            }
                            var storeQuantityOnHand = optionInventory.inventory_level;
                            if (storeQuantityOnHand>0)
                                optionOrderQuantity = MAX - storeQuantityOnHand;
                            else
                                optionOrderQuantity = MAX;
                            if (optionOrderQuantity>0) {
                                /**
                                 * Let's find out individual order quantities for items under an option,
                                 * then rationalise it to sum up to optionOrderQuantity
                                 */
                                var totalOrderQuantitiesForProducts = _.reduce(optionInventory.productModels, function (memo, num) {
                                    var orderQuantity = num.reorder_point - (num.inventory_level>0 ? num.inventory_level : 0);//treat negative store inventory as ZERO, as told by client
                                    return memo + orderQuantity;
                                }, 0);

                                _.each(optionInventory.productModels, function (eachProduct, index) {
                                    var productOrderQuantity = eachProduct.reorder_point - (eachProduct.inventory_level>0 ? eachProduct.inventory_level : 0);//treat negative store inventory as ZERO, as told by client
                                    productOrderQuantity = (productOrderQuantity / totalOrderQuantitiesForProducts) * optionOrderQuantity;
                                    var warehouseQuantity = _.find(optionLevelWarehouseInventory[optionKey].productModels, function (eachWarehouseProduct) {
                                            return eachProduct.productModelId.toString() === eachWarehouseProduct.productModelId.toString();
                                        }).inventory_level || 0;
                                    productOrderQuantity = warehouseQuantity>productOrderQuantity ? productOrderQuantity : warehouseQuantity;
                                    logger.debug({
                                        productModelId: eachProduct.productModelId,
                                        productOrderQuantity,
                                        storeQuantityOnHand,
                                        warehouseQuantity,
                                        totalOrderQuantitiesForProducts,
                                        optionOrderQuantity,
                                        messageId
                                    });
                                    if (productOrderQuantity>0) {
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
                                            categoryModelName: optionCategoryModel ? optionCategoryModel.name : '',  //need for sorting
                                            fulfilledQuantity: 0,
                                            receivedQuantity: 0,
                                            fulfilled: false,
                                            received: false,
                                            state: 'unboxed',
                                            approved: false,
                                            createdAt: new Date(),
                                            updatedAt: new Date()
                                        });
                                    }
                                });
                            }
                            else {
                                skippedLineItems.push(optionLevelStoreInventory[optionKey]);
                            }
                        }
                    }
                );
            }
            catch
                (e) {
                logger.error({
                    e,
                    error: e,
                    messageId
                });
            }
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
                messageId
            });
            totalRows = lineItemsToOrder.length;
            if (totalRows) {
                var warehouseInventoryByProduct = _.flatten(_.pluck(optionLevelWarehouseInventory, 'productModels'));
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
            return Promise.resolve('ERROR_REPORT');
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
            }else {
                return Promise.resolve();
            }
        });
}

function optimiseQuantitiesByStorePriority(lineItemsToOrder, warehouseInventory, storeModelId, orgModelId, messageId) {
    try {

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
            })
            .then(function (alreadyOrderedLineItems) {
                logger.debug({
                    message: 'These items already exist on another order generated today for another store',
                    count: alreadyOrderedLineItems.length,
                    commandName,
                    messageId
                });

                var combinedLineItems = _.union(alreadyOrderedLineItems, lineItemsToOrder);
                var sameSKUsGrouped = _.groupBy(combinedLineItems, 'productModelId');
                if (alreadyOrderedLineItems.length) {
                    logger.debug({
                        message: 'Will change the order quantities to accommodate deficit in warehouse inventory',
                        commandName,
                        messageId
                    });

                    var groupedProductModelIDs = Object.keys(sameSKUsGrouped);
                    var newTotalQuantitiesOrderedByAllStores = 0;
                    for (var i = 0; i<groupedProductModelIDs.length; i++) {

                        var totalQuantitiesOrderedByAllStores = _.reduce(sameSKUsGrouped[groupedProductModelIDs[i]], function (memo, num) {
                            return memo + num.originalOrderQuantity;
                        }, 0);
                        logger.debug({
                            totalQuantitiesOrderedByAllStores,
                            warehouseInventory: warehouseInventory[groupedProductModelIDs[i]],
                            productId: groupedProductModelIDs[i],
                            messageId,
                            commandName
                        });
                        if (totalQuantitiesOrderedByAllStores>warehouseInventory[groupedProductModelIDs[i]].inventory_level) {
                            newTotalQuantitiesOrderedByAllStores = 0;
                            _.each(sameSKUsGrouped[groupedProductModelIDs[i]], function (eachSKU) {
                                var orderQuantity = (eachSKU.originalOrderQuantity / totalQuantitiesOrderedByAllStores) * warehouseInventory[groupedProductModelIDs[i]].inventory_level;
                                eachSKU.orderQuantity = Math.round(orderQuantity);
                                eachSKU.roundedBy = eachSKU.orderQuantity - orderQuantity;
                                newTotalQuantitiesOrderedByAllStores += eachSKU.orderQuantity;
                            });
                            if (newTotalQuantitiesOrderedByAllStores>warehouseInventory[groupedProductModelIDs[i]].inventory_level) {
                                var extraQuantities = newTotalQuantitiesOrderedByAllStores - warehouseInventory[groupedProductModelIDs[i]].inventory_level;
                                sameSKUsGrouped[groupedProductModelIDs[i]] = _.sortBy(sameSKUsGrouped[groupedProductModelIDs[i]], 'roundedBy');
                                for (var j = sameSKUsGrouped[groupedProductModelIDs[i]].length - 1; j>sameSKUsGrouped[groupedProductModelIDs[i]].length - extraQuantities - 1; j--) {
                                    sameSKUsGrouped[groupedProductModelIDs[i]][j].orderQuantity--;
                                }
                            }
                        }
                    }
                }
                logger.debug({
                    sameSKUSGrouped: _.sample(sameSKUsGrouped)
                });

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
                return batch.execute();
            })
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
    catch (e) {
        logger.error({
            message: 'Error optimising according to store priority',
            reason: e,
            e,
            messageId
        });
    }
}
