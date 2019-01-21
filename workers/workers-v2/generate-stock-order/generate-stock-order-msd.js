const REPORT_EMPTY = 'Executing...';
const REPORT_COMPLETE = 'Complete';
const REPORT_ERROR = 'Error';
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
var runMe = function (payload, config, taskId, messageId) {

    var orgModelId = payload.orgModelId;
    var storeModelId = payload.storeModelId;
    var warehouseModelId = payload.warehouseModelId;
    try {
        // Global variable for logging

        logger.debug({
            commandName: commandName,
            argv: process.argv,
            env: process.env,
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
                        uri: utils.API_URL + '/api/OrgModels/' + orgModelId + '/sendWorkerStatus',
                        json: true,
                        headers: {
                            'Authorization': payload.loopbackAccessToken.id
                        },
                        body: {
                            messageId: messageId,
                            userId: payload.loopbackAccessToken.userId,
                            data: {
                                success: true
                            }
                        }
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
                        uri: utils.API_URL + '/api/OrgModels/' + orgModelId + '/sendWorkerStatus',
                        json: true,
                        headers: {
                            'Authorization': payload.loopbackAccessToken.id
                        },
                        body: {
                            messageId: messageId,
                            userId: payload.loopbackAccessToken.userId,
                            data: {
                                success: false
                            }
                        }
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
    var storeInventory;
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
    var reportModel, totalRows, lineItemsToOrder = [], warehouseInventory;
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
            return db.collection('ReportModel').insert({
                name: storeModelInstance.name + ' - ' + TODAYS_DATE.getFullYear() + '-' + (TODAYS_DATE.getMonth() + 1) + '-' + TODAYS_DATE.getDate(),
                orgModelId: ObjectId(orgModelId),
                storeModelId: ObjectId(storeModelId),
                created: new Date(),
                updated: new Date(),
                state: REPORT_EMPTY
            });
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
            return db.collection('InventoryModel').find({
                $and: [
                    {
                        storeModelId: ObjectId(storeModelId)
                    },
                    {
                        $where: 'this.inventory_level <= this.reorder_threshold'
                    }
                ]
            }).toArray();
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
                message: 'Found inventory model instances with inventory level less than reorder threshold, will look for warehouse inventories',
                count: inventoryModelInstances.length,
                commandName,
                storeModelId,
                warehouseModelId,
                orgModelId,
                messageId
            });
            storeInventory = inventoryModelInstances;
            var productModelIds = _.pluck(inventoryModelInstances, 'productModelId');
            return db.collection('InventoryModel').find({
                $and: [
                    {
                        storeModelId: ObjectId(warehouseModelId)
                    },
                    {
                        productModelId: {
                            $in: productModelIds
                        }
                    }
                ]
            }).toArray();
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
                payload
            });
            warehouseInventory = inventoryModelInstances;
            for (var i = 0; i<storeInventory.length; i++) {
                var correspondingWarehouseInventory = null;
                for (var j = 0; j<warehouseInventory.length; j++) {
                    if (warehouseInventory[j].productModelId.toString() === storeInventory[i].productModelId.toString()) {
                        correspondingWarehouseInventory = warehouseInventory[j];
                    }
                }
                if (!correspondingWarehouseInventory) {
                    logger.debug({
                        message: 'Could not find a corresponding inventory for product in warehouse, will skip the item',
                        productModelId: storeInventory[i].productModelId,
                        commandName,
                        payload
                    });
                }
                else {
                    var orderQuantity = storeInventory[i].reorder_point - storeInventory[i].inventory_level;
                    orderQuantity = correspondingWarehouseInventory.inventory_level>orderQuantity ? orderQuantity : correspondingWarehouseInventory.inventory_level;
                    if (orderQuantity) {
                    lineItemsToOrder.push({
                        reportModelId: ObjectId(reportModel._id),
                        productModelId: ObjectId(storeInventory[i].productModelId),
                        storeModelId: ObjectId(storeModelId),
                        orgModelId: ObjectId(orgModelId),
                            orderQuantity: orderQuantity,
                            originalOrderQuantity: orderQuantity,
                            fulfilledQuantity: 0,
                        state: 'unboxed',
                            approved: false,
                            createdAt: new Date(),
                            updatedAt: new Date()
                    });
                }
            }
            }
            logger.debug({
                message: 'Prepared to push these items to stock order',
                lineItemsToOrder,
                commandName,
                messageId
            });
            totalRows = lineItemsToOrder.length;
            return optimiseQuantitiesByStorePriority(lineItemsToOrder, warehouseInventory, storeModelId, orgModelId, messageId);
        })
        .catch(function (error) {
            logger.debug({
                message: 'Could not insert line items to report model',
                error,
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
                return db.collection('ReportModel').updateOne({
                    _id: reportModel._id
                }, {
                    $set: {
                        state: REPORT_ERROR,
                        totalRows: totalRows
                    }
                });
            }
            else {
                logger.debug({
                    message: 'Inserted items into report model successfully, and updated quantities in other reports. Will update report model',
                    result,
                    commandName,
                    messageId
                });
                return db.collection('ReportModel').updateOne({
                    _id: reportModel._id
                }, {
                    $set: {
                        state: REPORT_COMPLETE,
                        totalRows: totalRows
                    }
                });
            }
        });
}

function optimiseQuantitiesByStorePriority(lineItemsToOrder, warehouseInventory, storeModelId, orgModelId, messageId) {
    logger.debug({
        message: 'Will look for same SKUs ordered today for other stores',
        commandName,
        messageId
    });
    var todaysDate = new Date().getFullYear() + '-' + new Date().getMonth() + 1 + '-' + new Date().getDate();
    return db.collection('StockOrderLineitemModel').find({
        $and: [
            {
                productModelId: {
                    $in: _.pluck(lineItemsToOrder, 'productModelId')
                }
            },
            {
                createdAt: {
                    $gte: new Date(todaysDate)
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
    }).toArray()
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
                message: 'These items already exist on another order generated today',
                count: alreadyOrderedLineItems.length,
                stores: _.pluck(alreadyOrderedLineItems, 'storeModelId'),
                productIds: _.pluck(alreadyOrderedLineItems, 'productModelId'),
                commandName,
                warehouseInventory,
                messageId
            });
            alreadyOrderedLineItems = _.union(alreadyOrderedLineItems, lineItemsToOrder);
            debugger;
            var sameSKUsGrouped = _.groupBy(alreadyOrderedLineItems, 'productModelId');
            var groupedProductModelIDs = Object.keys(sameSKUsGrouped);
            var newTotalQuantitiesOrderedByAllStores = 0;
            for (var i = 0; i<groupedProductModelIDs.length; i++) {
                var warehouseInventoryQuantity = _.filter(warehouseInventory, function (eachInventory) {
                    return eachInventory.productModelId.toString() === groupedProductModelIDs[i].toString()
                })[0].inventory_level;

                var totalQuantitiesOrderedByAllStores = _.reduce(sameSKUsGrouped[groupedProductModelIDs[i]], function (memo, num) {
                    return memo + num.originalOrderQuantity;
                }, 0);
                logger.debug({
                    totalQuantitiesOrderedByAllStores,
                    warehouseInventoryQuantity
                });
                if (totalQuantitiesOrderedByAllStores>warehouseInventoryQuantity) {
                    _.each(sameSKUsGrouped[groupedProductModelIDs[i]], function (eachSKU) {
                        var orderQuantity = (eachSKU.originalOrderQuantity / totalQuantitiesOrderedByAllStores) * warehouseInventoryQuantity;
                        eachSKU.orderQuantity = Math.round(orderQuantity);
                        eachSKU.roundedBy = eachSKU.orderQuantity - orderQuantity;
                        newTotalQuantitiesOrderedByAllStores += eachSKU.orderQuantity;
                    });
                    if (newTotalQuantitiesOrderedByAllStores>warehouseInventoryQuantity) {
                        var extraQuantities = newTotalQuantitiesOrderedByAllStores - warehouseInventoryQuantity;
                        sameSKUsGrouped[groupedProductModelIDs[i]] = _.sortBy(sameSKUsGrouped[groupedProductModelIDs[i]], 'roundedBy');
                        for (var j = sameSKUsGrouped[groupedProductModelIDs[i]].length - 1; j>sameSKUsGrouped[groupedProductModelIDs[i]].length - extraQuantities - 1; j--) {
                            sameSKUsGrouped[groupedProductModelIDs[i]][j].orderQuantity--;
                        }
                    }
                }
            }
            logger.debug({
                message: 'Will change the order quantities to accommodate deficit in warehouse inventory',
                newOrderQuantities: sameSKUsGrouped,
                commandName,
                messageId
            });
            var batch = db.collection('StockOrderLineitemModel').initializeUnorderedBulkOp();
            _.each(_.flatten(_.values(sameSKUsGrouped), true), function (eachLineItem) {
                if (eachLineItem._id) {
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
                    batch.insert(eachLineItem);
                }
            });
            return batch.execute();
        });
}
