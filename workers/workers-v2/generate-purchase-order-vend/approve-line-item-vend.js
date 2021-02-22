const path = require('path');
const commandName = path.basename(__filename, '.js'); // gives the filename without the .js extension
const logger = require('sp-json-logger')({fileName: 'workers:workers-v2:' + commandName});
const dbUrl = process.env.DB_URL;
const MongoClient = require('mongodb').MongoClient;
const ObjectId = require('mongodb').ObjectID;
var db = null; //database connected
const utils = require('../../jobs/utils/utils.js');
const Promise = require('bluebird');
const rp = require('request-promise');

var runMe = function (payload, config, taskId, messageId) {
    var stockOrderLineItemIds = payload.stockOrderLineItemIds;
    var reportModelId = payload.reportModelId;
    var reportModelInstance, stockOrderLineItemModels, storeModelInstance, supplierModelInstance, createdPurchaseOrder;
    try {
        logger.debug({
            commandName: commandName,
            argv: process.argv,
            stockOrderLineItemIds,
            messageId,
            payload
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
                    message: 'Connected to Mongo DB, will look for Report model',
                    commandName,
                    messageId
                });
                return db.collection('ReportModel').findOne({
                    _id: ObjectId(reportModelId)
                });
            })
            .catch(function (error) {
                logger.error({
                    message: 'Could not find report model instance',
                    stockOrderLineItemIds,
                    reportModelId,
                    error,
                    commandName,
                    messageId
                });
                return Promise.reject('Could not find report instances');
            })
            .then(function (response) {
                reportModelInstance = response;
                logger.debug({
                    message: 'Found report model instance, will look for store and supplier model',
                    response,
                    messageId
                });
                return Promise.all([
                    db.collection('StoreModel').findOne({
                        _id: ObjectId(reportModelInstance.storeModelId)
                    }),
                    db.collection('SupplierModel').findOne({
                        _id: ObjectId(reportModelInstance.supplierModelId)
                    })
                ]);
            })
            .catch(function (error) {
                logger.error({
                    message: 'Could not find store, supplier instances',
                    reportModelId,
                    error,
                    commandName,
                    messageId
                });
                return Promise.reject('Could not find store, supplier instances');
            })
            .then(function (response) {
                storeModelInstance = response[0];
                supplierModelInstance = response[1];
                logger.debug({
                    message: 'Found report, store and supplier instance',
                    response,
                    commandName,
                    messageId
                });
                if (!reportModelInstance.vendConsignmentId) {
                    logger.debug({
                        message: 'Will create a stock order',
                        response,
                        commandName,
                        messageId
                    });
                    return utils.createStockOrderForVend(db, storeModelInstance, reportModelInstance, supplierModelInstance, messageId)
                        .then(function (result) {
                            createdPurchaseOrder = result;
                            reportModelInstance.vendConsignmentId = result.id;
                            reportModelInstance.vendConsignment = result;
                            logger.debug({
                                message: 'Created empty purchase order in Vend, will save details in db',
                                result,
                                commandName,
                                messageId
                            });

                            return db.collection('ReportModel').updateOne({
                                _id: ObjectId(reportModelId)
                            }, {
                                $set: {
                                    vendConsignmentId: result.id,
                                    vendConsignment: result
                                }
                            });

                        });
                } else {
                    logger.debug({
                        message: 'Skipping order creating, already present',
                        response,
                        commandName,
                        messageId
                    });
                    return Promise.resolve({});
                }
            })
            .then(function () {
                if (!utils.notApprovedStates.includes(reportModelInstance.state)) {
                    logger.debug({
                        message: 'Order state is not in notApprovedStates, will skip order items update',
                        commandName,
                        messageId
                    });
                    // No need to proceed if report is not in generated state
                    return Promise.resolve([]);
                }

                const matchQueryForItems = {
                    reportModelId: ObjectId(reportModelId),
                };

                if (stockOrderLineItemIds.length > 0) {
                    matchQueryForItems._id = {
                        $in: stockOrderLineItemIds.map(function (stockOrderLineItemId) {
                            return ObjectId(stockOrderLineItemId);
                        }),
                    };
                }

                var aggregationQuery = [
                    {
                        $match: matchQueryForItems
                    },
                    {
                        $lookup: {
                            'from': 'ProductModel',
                            'localField': 'productModelId',
                            'foreignField': '_id',
                            'as': 'productModel'
                        }
                    },
                    {
                        $project: {
                            product_id: '$productModel.api_id',
                            orderQuantity: '$orderQuantity',
                            count: '$orderQuantity',
                            supplyPrice: '$supplyPrice',
                            orgModelId: '$orgModelId',
                            approved: '$approved',
                            vendConsignmentProductId: '$vendConsignmentProductId',
                            vendConsignmentProduct: '$vendConsignmentProduct'
                        }
                    },
                    {
                        $unwind: '$product_id'
                    }
                ];
                return db.collection('StockOrderLineitemModel').aggregate(aggregationQuery).toArray();
            })
            .catch(function (error) {
                logger.error({
                    message: 'Could not find StockOrderLineitemModel instances',
                    stockOrderLineItemIds,
                    error,
                    commandName,
                    messageId
                });
                return Promise.reject('Could not find StockOrderLineitemModel instances');
            })
            .then(function (stockOrderLineItemModelInstances) {
                stockOrderLineItemModels = stockOrderLineItemModelInstances;
                logger.debug({
                    message: 'Found stockOrderLineitemModel instances',
                    count: stockOrderLineItemModelInstances.length,
                    sampleProduct: stockOrderLineItemModelInstances[0],
                    messageId
                });
                return utils.fetchVendToken(db, reportModelInstance.orgModelId, messageId);
            })
            .then(function (token) {
                logger.debug({
                    message: 'Fetched vend token, will fetch connection info',
                    messageId
                });
                return utils.getVendConnectionInfo(db, reportModelInstance.orgModelId, messageId);
            })
            .then(function (connectionInfo){
                    return Promise.map(stockOrderLineItemModels, function (lineItem) {
                        return Promise.delay(1000)
                            .then(function () {
                                // Is Approved but not yet pushed into vend
                                if (!lineItem.vendConsignmentProductId && lineItem.approved === true) {
                                    logger.debug({
                                        message: 'Will push a line item to vend',
                                        lineItem,
                                        messageId
                                    });
                                    return utils.createStockOrderLineitemForVend(db,
                                        connectionInfo,
                                        storeModelInstance,
                                        reportModelInstance,
                                        lineItem,
                                        messageId
                                    );
                                } else if(lineItem.vendConsignmentProductId && lineItem.approved === true) {
                                    logger.debug({
                                        message: 'Will update a line item to vend',
                                        lineItem,
                                        messageId
                                    });
                                    return utils.updateStockOrderLineitemForVend(db, reportModelInstance, lineItem, messageId);
                                } else if(lineItem.vendConsignmentProductId && lineItem.approved === false) {
                                    logger.debug({
                                        message: 'Will delete a line item from vend',
                                        lineItem,
                                        messageId
                                    });
                                    // Approved false
                                    return utils.deleteStockOrderLineitemForVend(db, lineItem, messageId)
                                        .then(function (response) {
                                            logger.debug({
                                                message: 'Deleted line item from Vend, will update vend deleted status in DB',
                                                response,
                                                messageId,
                                                lineItem
                                            });
                                            return db.collection('StockOrderLineitemModel').updateOne({
                                                _id: ObjectId(lineItem._id)
                                            }, {
                                                // Not setting vendDeletedAt since that would
                                                // cause trouble while receiving
                                                $set: {
                                                    vendConsignmentProductId: null,
                                                    vendConsignmentProduct: null,
                                                }
                                            });
                                        })
                                        .then(function () {
                                            return Promise.resolve();
                                        });

                                }
                            })
                            .then(function (vendConsignmentProduct) {
                                const updates = {
                                    asyncPushSuccess: true
                                };
                                if (vendConsignmentProduct) {
                                    logger.debug({
                                        message: 'Added/ Updated product to vend consignment, will save details to db',
                                        vendConsignmentProduct,
                                        messageId
                                    });
                                    updates.vendConsignmentProductId = vendConsignmentProduct.id;
                                    updates.vendConsignmentProduct = vendConsignmentProduct;
                                }
                                logger.debug({
                                    message: 'Will save success status for this line Item',
                                    vendConsignmentProduct,
                                    messageId
                                });
                                return db.collection('StockOrderLineitemModel').updateOne({
                                    _id: ObjectId(lineItem._id)
                                }, {
                                    $set: updates
                                });
                            })
                            .then(function () {
                                logger.debug({
                                    commandName: commandName,
                                    message: 'updated lineItem in Vend successfully, will send the status to worker',
                                    messageId,
                                });
                                const options = {
                                    method: 'POST',
                                    uri: utils.PUBLISH_URL,
                                    json: true,
                                    headers: {
                                        'Authorization': payload.loopbackAccessToken.id
                                    },
                                    body: new utils.Notification(
                                        utils.workerType.APPROVE_LINE_ITEM_VEND,
                                        payload.eventType,
                                        utils.workerStatus.SUCCESS,
                                        {success: true, stockOrderLineItemId: lineItem._id, approved: lineItem.approved},
                                        payload.callId
                                    )

                                };
                                return rp(options)
                                    .catch(function (error) {
                                        logger.error({
                                            message: 'Could not send notification',
                                            lineItem,
                                            error,
                                            commandName,
                                            messageId
                                        });
                                    });
                            })
                            .catch(function (error){
                                logger.error({
                                    message: 'Could not push line item to vend, will set error status to true',
                                    lineItem,
                                    error,
                                    commandName,
                                    messageId
                                });
                                return db.collection('StockOrderLineitemModel').updateOne({
                                    _id: ObjectId(lineItem._id)
                                }, {
                                    $set: {
                                        asyncPushSuccess: false
                                    }
                                }).then(function () {
                                    return Promise.reject(error);
                                });
                            })
                            .catch(function () {
                                logger.debug({
                                    commandName: commandName,
                                    message: 'Error updating lineitem in vend, will send the status and move to next Item',
                                    messageId,
                                });
                                const options = {
                                    method: 'POST',
                                    uri: utils.PUBLISH_URL,
                                    json: true,
                                    headers: {
                                        'Authorization': payload.loopbackAccessToken.id
                                    },
                                    body: new utils.Notification(
                                        utils.workerType.APPROVE_LINE_ITEM_VEND,
                                        payload.eventType,
                                        utils.workerStatus.FAILED,
                                        {success: false,
                                            stockOrderLineItemId: lineItem._id,
                                            approved: lineItem.approved},
                                        payload.callId
                                    )
                                };
                                return rp(options)
                                    .catch(function (error) {
                                        logger.error({
                                            message: 'Could not send notification',
                                            lineItem,
                                            error,
                                            commandName,
                                            messageId
                                        });
                                    });
                            });

                    }, { concurrency: 1 });

            })
            .catch(function (error) {
                    logger.error({
                        commandName,
                        error,
                        reason: error,
                        message: 'Could not update approved quantities for line item',
                        messageId
                    });
                    const matchQueryForItems = {
                        reportModelId: ObjectId(reportModelId),
                    };

                    if (stockOrderLineItemIds.length > 0) {
                        matchQueryForItems._id = {
                            $in: stockOrderLineItemIds.map(function (stockOrderLineItemId) {
                                return ObjectId(stockOrderLineItemId);
                            }),
                        };
                    }
                    return db.collection('StockOrderLineitemModel').updateMany(matchQueryForItems,
                        {
                            $set: {
                                asyncPushSuccess: false
                            }
                    }).then(function () {
                        return Promise.reject('Could not update approved quantities for line item');
                    });
            });
        // return Promise.resolve();
    } catch (e) {
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
