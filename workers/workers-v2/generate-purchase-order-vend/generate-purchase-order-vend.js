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
                        message: 'Found report, store and supplier instance, will update it\'s state',
                        response,
                        commandName,
                        messageId
                    });
                    return db.collection('ReportModel').updateOne({
                        _id: ObjectId(reportModelId)
                    }, {
                        $set: {
                            state: REPORT_STATES.SENDING_TO_SUPPLIER
                        }
                    });
                })
                .then(function (response) {
                    logger.debug({
                        message: 'Updated report model status, create an empty purchase order in Vend',
                        response,
                        messageId
                    });
                    return utils.createStockOrderForVend(db, storeModelInstance, reportModelInstance, supplierModelInstance, messageId);
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
                        message: 'Updated report model with vend consignment details, will look for line items',
                        response,
                        messageId
                    });
                    var aggregationQuery = [
                        {
                            $match: {
                                reportModelId: ObjectId(reportModelId),
                                approved: true
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
                                supplyPrice: '$supplyPrice'
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
                    return Promise.map(stockOrderLineItemModelInstances, function (eachLineItem) {
                        return utils.createStockOrderLineitemForVend(db, storeModelInstance, reportModelInstance, eachLineItem, messageId)
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
                                        vendConsignmentProduct: vendConsignmentProduct
                                    }
                                });
                            })
                    });
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
                            state: REPORT_STATES.FULFILMENT_FAILURE
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
                        reportModelId
                    });
                    return Promise.resolve('Updated status in report model to FULFILL');
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
                            payload.userId
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
                            payload.userId
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
