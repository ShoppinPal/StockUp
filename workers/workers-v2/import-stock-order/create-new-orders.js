const path = require('path');
const commandName = path.basename(__filename, '.js'); // gives the filename without the .js extension
const logger = require('sp-json-logger')({fileName: 'workers:workers-v2:' + commandName});
const Promise = require('bluebird');
const _ = require('underscore');
const ObjectId = require('mongodb').ObjectID;
const utils = require('./../../jobs/utils/utils.js');
const REPORT_STATES = utils.REPORT_STATES;

function createNewOrders(db, result, orderConfigModel, payload, config, taskId, messageId) {
    var createdOrders;
    return createOrders(db, orderConfigModel, result, messageId)
        .catch(function (error) {
            logger.error({
                message: 'Could not save orders to database',
                error,
                messageId
            });
            return Promise.reject('Could not save orders to database');
        })
        .then(function (response) {
            createdOrders = response;
            logger.debug({
                message: 'Saved orders to db successfully',
                createdOrders,
                messageId
            });
            let notApprovedStates = [
                REPORT_STATES.APPROVAL_IN_PROCESS,
                REPORT_STATES.GENERATED,
                REPORT_STATES.PROCESSING
            ];
            if (!notApprovedStates.includes(orderConfigModel.orderStatus)) {
                logger.debug({
                    message: `Orders should be in state ${orderConfigModel.orderStatus}, will push order to Vend`,
                    messageId
                });
                return Promise.map(createdOrders, function (eachCreatedOrder) {
                    return Promise.resolve()
                        // Call generate worker
                        .then(function (){
                            let generatePurchaseOrderVend = require('../generate-purchase-order-vend/generate-purchase-order-vend');
                            let purchaseOrderPayload = {
                                loopbackAccessToken: payload.loopbackAccessToken,
                                orgModelId: ObjectId(orderConfigModel.orgModelId),
                                reportModelId: ObjectId(eachCreatedOrder._id), //get the reportModelId from lineItem saved
                            };
                            return generatePurchaseOrderVend.run(purchaseOrderPayload, config, taskId, messageId);
                        })
                        // get state of report after generate
                        .then(function (){
                            return db.collection('ReportModel')
                                .findOne({
                                    _id: ObjectId(eachCreatedOrder._id)
                                });
                        })
                        // Update State to desired State
                        .then(function (reportInstance){
                            if (reportInstance.state !== REPORT_STATES.ERROR_SENDING_TO_SUPPLIER) {
                                return db.collection('ReportModel').updateOne({
                                    _id: ObjectId(eachCreatedOrder._id)
                                }, {
                                    $set: {
                                        state: orderConfigModel.orderStatus
                                    }
                                });
                            }

                            return Promise.resolve();
                        });

                }, {
                    concurrency: 1 //don't want to refresh vend access token for all orders
                });
            }
            else {
                logger.debug({
                    message: `Orders should be in state ${orderConfigModel.orderStatus}, need not push order to Vend`,
                    messageId
                });
                return Promise.map(createdOrders, function (eachCreatedOrder) {
                    return Promise.resolve()
                        .then(function() {
                            return db.collection('ReportModel').updateOne({
                                _id: ObjectId(eachCreatedOrder._id)
                            }, {
                                $set: {
                                    state: orderConfigModel.orderStatus
                                }
                            });
                        });
                });
            }
        })
        .catch(function (error) {
            logger.error({
                message: 'Could not push order to Vend',
                error,
                reason: error,
                messageId
            });
            return Promise.reject('Could not push order to Vend');
        })
        .then(function () {
            return Promise.resolve(createdOrders);
        });
}


function createOrders(db, orderConfigModel ,orders, messageId) {
    let createdOrders = [];
    return Promise.map(orders, function (eachOrder) {
        logger.debug({
            message: 'Will look for supplier\'s virtual store',
            eachOrder,
            messageId
        });
        return db.collection('StoreModel').findOne({
            ownerSupplierModelId: ObjectId(eachOrder.supplierModelId)
        })
            .catch(function (error) {
                logger.error({
                    message: 'Could not find supplier\'s virtual store',
                    eachOrder,
                    messageId
                });
                return Promise.reject('Could not find supplier\'s virtual store');
            })
            .then(function (storeModelInstance) {
                if (!storeModelInstance) {
                    logger.error({
                        message: 'Could not find supplier\'s virtual store',
                        eachOrder,
                        messageId
                    });
                    return Promise.reject('Could not find supplier\'s virtual store');
                }
                logger.debug({
                    message: 'Found supplier\'s virtual store',
                    storeModelInstance,
                    messageId
                });
                eachOrder.deliverFromStoreModelId = ObjectId(storeModelInstance._id);
                eachOrder.importedFromFile = true;
                let notApprovedStates = [
                    REPORT_STATES.APPROVAL_IN_PROCESS,
                    REPORT_STATES.GENERATED,
                    REPORT_STATES.PROCESSING
                ];
                if (!notApprovedStates.includes(orderConfigModel.orderStatus)) {
                    eachOrder.desiredState = orderConfigModel.orderStatus;
                }
                return db.collection('ReportModel').insert(
                    Object.assign(
                        {},
                        _.omit(eachOrder, 'lineItems', 'groupBy'),
                        {
                            state: ""
                        }
                    )

                );
            })
            .catch(function (error) {
                logger.error({
                    message: 'Could not create report model',
                    error,
                    reason: error,
                    messageId
                });
                return Promise.reject('Could not create report model');
            })
            .then(function (response) {
                logger.debug({
                    message: 'Created order',
                    response,
                    messageId
                });
                createdOrders.push(response.ops[0]);
                return db.collection('StockOrderLineitemModel').insertMany(_.map(eachOrder.lineItems, function (eachLineItem) {
                    return _.extend(eachLineItem, {reportModelId: ObjectId(response.ops[0]._id)});
                }));
            })
            .catch(function (error) {
                logger.error({
                    message: 'Could not create line items',
                    error,
                    messageId
                });
                return Promise.resolve('Could not create line items, move on to next order?');
            });
    })
        .then(function (response) {
            logger.debug({
                message: 'Saved orders to db successfully',
                createdOrders,
                messageId
            });
            return Promise.resolve(createdOrders);
        });
}


module.exports = {
    createNewOrders
};
