const path = require('path');
const commandName = path.basename(__filename, '.js'); // gives the filename without the .js extension
const logger = require('sp-json-logger')({fileName: 'workers:workers-v2:' + commandName});
const dbUrl = process.env.DB_URL;
const MongoClient = require('mongodb').MongoClient;
const ObjectId = require('mongodb').ObjectID;
var db = null; //database connected
const utils = require('./../../jobs/utils/utils.js');
const _ = require('underscore');
const Promise = require('bluebird');
const TODAYS_DATE = new Date();
const rp = require('request-promise');
const REPORT_STATES = utils.REPORT_STATES;

var runMe = function (payload, config, taskId, messageId) {

    var orgModelId = payload.orgModelId;
    var reportModelId = payload.reportModelId;
    var createdPurchaseOrder, stockOrderLineItemModels, supplierModelInstance, storeModelInstance;
    var reportModelInstance;


    function isProductNotFromSameConsignment(eachLineItem) {
        return eachLineItem.vendConsignmentProduct &&
            eachLineItem.vendConsignmentProduct.consignment_id !==
            reportModelInstance.vendConsignmentId;
    }

    try {
        // Global variable for logging

        logger.debug({
            payload,
            commandName: commandName,
            argv: process.argv,
            orgModelId,
            reportModelId,
            messageId
        });

        try {
            logger.debug({
                commandName: commandName,
                message: 'This worker will push a purchase order to Vend',
                orgModelId,
                reportModelId,
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
                        message: 'Connected to Mongo DB, will look for report model',
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
                        reportModelId,
                        error,
                        commandName,
                        messageId
                    });
                    return Promise.reject('Could not find report, store, supplier instances');
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
                            message: 'Will Create Stock Order, not already created',
                            response,
                            commandName,
                            messageId
                        });
                        return utils.createStockOrderForVend(db, storeModelInstance, reportModelInstance, supplierModelInstance, messageId);
                    } else {
                        logger.debug({
                            message: 'Skipping Stock Order generation , already generated',
                            response,
                            commandName,
                            messageId
                        });
                        return Promise.resolve(reportModelInstance.vendConsignment);
                    }
                })
                .catch(function (error) {
                    logger.error({
                        commandName,
                        error,
                        message: 'Could not create transfer order header',
                        messageId
                    });
                    return Promise.reject('Could not create transfer order header');
                })
                .then(function (result) {
                    createdPurchaseOrder = result;
                    reportModelInstance.vendConsignmentId = result.id;
                    reportModelInstance.vendConsignment = result;
                    logger.debug({
                        message: 'Found purchase order details',
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

                })
                .catch(function (error) {
                    logger.error({
                        error,
                        message: 'Could not update report model with vendConsignment',
                        messageId
                    });
                    return Promise.reject('Could not update report model with vendConsignment');
                })
                .then(function (response) {
                    logger.debug({
                        message: 'Updated report model with vend consignment details,' +
                            ' will look for line items that havent been pushed yet',
                        response,
                        messageId
                    });
                    var aggregationQuery = [
                        {
                            $match: {
                                reportModelId: ObjectId(reportModelId),
                                $or:[
                                    // Case 1: Worker Failed to Async Push
                                    {asyncPushSuccess: false},
                                    // Case 2: Somehow worker failed to pick up the job
                                    {
                                        asyncPushSuccess: null,
                                    },
                                    // Case 3: We deleted vendConsignment from DB manually need to push all items
                                    {
                                        vendConsignmentProduct: {$exists: true},
                                        "vendConsignmentProduct.consignment_id": {
                                            $ne: reportModelInstance.vendConsignmentId
                                        }
                                    }
                                ],
                            }
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
                                count: '$orderQuantity',
                                orderQuantity: '$orderQuantity',
                                approved: '$approved',
                                orgModelId: '$orgModelId',
                                supplyPrice: '$supplyPrice',
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
                        error,
                        message: 'Could not find stockOrderLineitemModels',
                        messageId
                    });
                    return Promise.reject('Could not find stockOrderLineitemModels');
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
                .then(function (connectionInfo) {
                    return Promise.map(stockOrderLineItemModels, function (eachLineItem) {
                        logger.debug({
                            message: 'Will work on line item',
                            messageId,
                            eachLineItem
                        });
                        return Promise.delay(1000)
                            .then(function () {
                                if (
                                    // Approved but not yet pushed to vend
                                    (!eachLineItem.vendConsignmentProductId && eachLineItem.approved === true) ||
                                    // Order's id & product's order id doesnt match
                                    // possibly because order id was regenerated
                                    (
                                        eachLineItem.approved === true &&
                                        isProductNotFromSameConsignment(eachLineItem))
                                ){
                                    logger.debug({
                                        message: 'Line item not already in vend, will push it',
                                        messageId,
                                        eachLineItem
                                    });
                                    return utils.createStockOrderLineitemForVend(db, connectionInfo, storeModelInstance, reportModelInstance, eachLineItem, messageId)
                                        .then(function (vendConsignmentProduct) {
                                            logger.debug({
                                                message: 'Added product to vend consignment, will save details to db',
                                                vendConsignmentProduct,
                                                messageId
                                            });
                                            return db.collection('StockOrderLineitemModel').updateOne({
                                                _id: eachLineItem._id
                                            }, {
                                                $set: {
                                                    vendConsignmentProductId: vendConsignmentProduct.id,
                                                    vendConsignmentProduct: vendConsignmentProduct,
                                                    asyncPushSuccess: true
                                                }
                                            });
                                        });
                                } else if (
                                    // Not Approved but pushed to vend
                                    eachLineItem.approved === false &&
                                    eachLineItem.vendConsignmentProductId &&
                                    !isProductNotFromSameConsignment(eachLineItem)
                                ) {
                                    // Not Approved but pushed to vend need to delete from vend
                                    logger.debug({
                                        message: 'Line item is not approved but pushed to vend will delete it',
                                        messageId,
                                        eachLineItem
                                    });
                                    return utils.deleteStockOrderLineitemForVend(db, eachLineItem, messageId)
                                        .then(function (response) {
                                            logger.debug({
                                                message: 'Deleted line item from Vend, will update vend deleted status in DB',
                                                response,
                                                messageId,
                                                eachLineItem
                                            });
                                            return db.collection('StockOrderLineitemModel').updateOne({
                                                _id: ObjectId(eachLineItem._id)
                                            }, {
                                                $set: {
                                                    vendConsignmentProductId: null,
                                                    vendConsignmentProduct: null,
                                                    asyncPushSuccess: true
                                                }
                                            });
                                        });
                                } else if(
                                    // Approved & Pushed to vend orderQuantity might have changed
                                    eachLineItem.vendConsignmentProductId &&
                                    eachLineItem.approved === true &&
                                    !isProductNotFromSameConsignment(eachLineItem)
                                ) {
                                    // Worker previously failed to update / will update now
                                    logger.debug({
                                        message: 'Worker previously failed to update / will update now',
                                        messageId,
                                        eachLineItem
                                    });
                                    return utils.updateStockOrderLineitemForVend(db, reportModelInstance, eachLineItem, messageId)
                                        .then(function (response) {
                                            logger.debug({
                                                message: 'updated line item in Vend, will update status in DB',
                                                response,
                                                messageId,
                                                eachLineItem
                                            });
                                            return db.collection('StockOrderLineitemModel').updateOne({
                                                _id: ObjectId(eachLineItem._id)
                                            }, {
                                                $set: {
                                                    asyncPushSuccess: true
                                                }
                                            });
                                        });
                                } else {
                                    logger.debug({
                                        message: 'Unknown line item case',
                                        messageId,
                                        eachLineItem
                                    });
                                }
                            })
                            .catch(function (error) {
                                logger.error({
                                    message: 'Could not update/push line items to purchase order in Vend',
                                    error,
                                    commandName,
                                    messageId,
                                    reportModelId,
                                    eachLineItem
                                });
                                return Promise.reject(error);
                            });
                    }, {concurrency: 1});
                })
                .catch(function (error) {
                    logger.error({
                        message: 'Could not push line items to purchase order in Vend',
                        error,
                        commandName,
                        messageId,
                        reportModelId
                    });
                    return Promise.reject('Could not push line items to purchase order in Vend');
                })
                .then(function (result) {
                    logger.debug({
                        message: 'Pushed transfer order lines to purchase order in Vend, will update order status to SENT in Vend',
                        reportModelId,
                        commandName,
                        messageId,
                        result
                    });
                    return utils.markStockOrderAsSent(db, reportModelInstance, messageId);
                })
                .catch(function (error) {
                    logger.error({
                        message: 'Could not update order status to SENT in Vend, will update failure status',
                        reportModelId,
                        messageId,
                        error,
                        reason: error
                    });
                    return db.collection('ReportModel').updateOne({
                        _id: ObjectId(reportModelId)
                    }, {
                        $set: {
                            state: REPORT_STATES.ERROR_SENDING_TO_SUPPLIER
                        }
                    })
                        .then(function (response) {
                            logger.debug({
                                message: 'Updated order status to FULFILMENT FAILURE',
                                reportModelId,
                                messageId,
                                response
                            });
                            return Promise.reject('Could not update order status to SENT in Vend');
                        });
                })
                .then(function (updatedPurchaseOrder) {
                    logger.debug({
                        message: 'Updated order status to SENT in Vend, will update status in DB',
                        updatedPurchaseOrder,
                        messageId
                    });
                    return db.collection('ReportModel').updateOne({
                        _id: ObjectId(reportModelId)
                    }, {
                        $set: {
                            state: REPORT_STATES.FULFILMENT_PENDING,
                            vendConsignmentId: createdPurchaseOrder.id,
                            vendConsignment: createdPurchaseOrder
                        }
                    });
                })
                .catch(function (error) {
                    logger.error({
                        message: 'Could not update report model to FULFILL state',
                        messageId,
                        commandName,
                        error,
                        reportModelId
                    });
                    return Promise.reject('Could not update report model to FULFILL state');
                })
                .then(function (result) {
                    logger.debug({
                        message: 'Updated status in report model to FULFILL',
                        result,
                        commandName,
                        reportModelId,
                        messageId
                    });
                    return Promise.resolve('Updated status in report model to FULFILL');
                })
                .then(function () {
                    logger.debug({
                        message: 'Will Remove asyncPushSuccess flag from lineItems',
                        messageId,
                        reportModelId,
                    });
                    return db.collection('StockOrderLineitemModel').updateMany({
                        reportModelId: ObjectId(reportModelId)
                    }, {
                        $unset: {
                            asyncPushSuccess: true
                        }
                    }).catch(function(error) {
                        logger.debug({
                            error,
                            messageId,
                            message: 'Could not remove asyncPushSuccess flag from line items, will move on anyways',
                        });
                    });
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
                            utils.workerType.CREATE_PURCHASE_ORDER_VEND,
                            payload.eventType,
                            utils.workerStatus.SUCCESS,
                            {success: true, reportModelId: payload.reportModelId},
                            payload.callId
                        )

                    };
                    logger.debug({
                        commandName: commandName,
                        message: 'Generated purchase order in Vend, will send the status to worker',
                        result,
                        messageId,
                        options
                    });
                    return rp(options);
                })
                .catch(function (error) {
                    logger.error({
                        commandName: commandName,
                        message: 'Could not generate purchase order, will send the following status',
                        reason: error,
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
                            utils.workerType.CREATE_PURCHASE_ORDER_VEND,
                            payload.eventType,
                            utils.workerStatus.FAILED,
                            {success: false, reportModelId: payload.reportModelId},
                            payload.callId
                        )

                    };
                    var slackMessage = 'Generate purchase order Vend Worker failed for reportModelId ' + reportModelId + '\n taskId' +
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
                    return Promise.reject('Could not send status to server');
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
