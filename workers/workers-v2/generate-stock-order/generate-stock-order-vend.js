const path = require('path');
const commandName = path.basename(__filename, '.js'); // gives the filename without the .js extension
const logger = require('sp-json-logger')({fileName: 'workers:workers-v2:' + commandName});
const {
    approvedStates,
    fulfilledStates,
    receivedStates,
    notApprovedStates,
    notReceivedStates,
} = require('../../jobs/utils/utils');

var fulfillAndReceiveConsignment = function (payload, config, taskId, messageId) {
    'use strict';
    var Promise = require('bluebird');
    const ObjectId = require('mongodb').ObjectID;
    const utils = require('./../../jobs/utils/utils.js');
    const REPORT_STATES = utils.REPORT_STATES;
    let reportModel = payload.reportModel,
        db = payload.db,
        supplier = payload.supplier;
    logger.debug({
        functionName: 'fulfillAndReceiveConsignment',
        messageId: messageId,
        message: 'Will update report status to REceive Pending And send to consignment for receive'
    });
    return db.collection('ReportModel').update(
        {
            _id: ObjectId(reportModel._id),
            state: REPORT_STATES.FULFILMENT_PENDING
        },
        {
            $set: {
                state: utils.REPORT_STATES.RECEIVING_PENDING,
                fulfilledByUserModelId: payload.loopbackAccessToken.userId
            }
        }
    ).catch(function (error) {
        logger.error({
            functionName: 'fulfillAndReceiveConsignment',
            messageId: messageId,
            error,
            message: 'Error updating report state to RECEIVING_PENDING'
        });
        return Promise.reject('Error updating report state to RECEIVING_PENDING');
    })
        .then(function (result) {
            let receiveConsignmentVend = require('../receive-consignment/receive-consignment-vend');
            const receiveConsignmentPayload = {
                orgModelId: payload.orgModelId,
                reportModelId: reportModel._id,
                loopbackAccessToken: payload.loopbackAccessToken,
            };
            logger.debug({
                result,
                messageId: messageId,
                supplierDefaultState: supplier.reportDefaultState,
                receiveConsignmentPayload,
                functionName: 'fulfillAndReceiveConsignment',
                message: `Will call receive-consignment-vend worker to reach target state of ${supplier.reportDefaultState}`
            });
            return receiveConsignmentVend.run(receiveConsignmentPayload, config, taskId, messageId);
        });

};


var runMe = function (payload, config, taskId, messageId) {

    try {
        var Promise = require('bluebird');
        var _ = require('underscore');
        var dbUrl = process.env.DB_URL;
        var MongoClient = require('mongodb').MongoClient;
        var ObjectId = require('mongodb').ObjectID;
        var fs = require('fs');
        var utils = require('./../../jobs/utils/utils.js');
        const REPORT_STATES = utils.REPORT_STATES;
        var db = null; //database connected
        const rp = require('request-promise');
        var productInstances, inventoryInstances, reportModel, supplier;
        var toGenerateReorderPoints = false;

        logger.debug({
            messageId: messageId,
            payload: payload,
            config: config,
            taskId: taskId,
            argv: process.argv
        });

        process.env['User-Agent'] = taskId + ':' + messageId + ':' + commandName + ':' + payload.domainPrefix;

        logger.debug({
            messageId: messageId,
            message: `This worker will generate stock order for outlet ${payload.storeModelId} and supplier ${payload.supplierModelId}`
        });
        return Promise.resolve()
            .then(function () {
                logger.debug({
                    message: 'Will connect to Mongodb',
                    messageId
                });
                return MongoClient.connect(dbUrl, {
                    promiseLibrary: Promise
                });
            })
            .catch(function (error) {
                logger.error({
                    message: 'Could not connect to Mongodb',
                    messageId,
                    error
                });
                return Promise.reject('Could not connect to Mongodb');
            })
            .then(function (dbInstance) {
                db = dbInstance;
                logger.debug({
                    message: 'will look for user\'s roles, store and supplier info',
                    messageId
                });
                return Promise.all([
                    db.collection('StoreModel').findOne({
                        _id: ObjectId(payload.storeModelId)
                    }),
                    db.collection('SupplierModel').findOne({
                        _id: ObjectId(payload.supplierModelId)
                    }),
                    db.collection('OrgModel').findOne({
                        _id: ObjectId(payload.orgModelId)
                    })
                ]);
            })
            .catch(function (error) {
                logger.error({
                    message: 'Could not find store and supplier details',
                    error,
                    messageId
                });
                return Promise.reject('Could not find store and supplier details');
            })
            .spread(function (storeModelInstance, supplierModelInstance, orgModelInstance) {
                supplier = supplierModelInstance;
                if (!storeModelInstance) {
                    logger.error({
                        message: 'Could not find store info, will exit',
                        storeModelId: payload.storeModelId,
                        messageId
                    });
                    return Promise.reject('Could not find store info, will exit');
                }
                if (!supplierModelInstance) {
                    logger.error({
                        message: 'Could not find supplier info, will exit',
                        supplierModelId: payload.supplierModelId,
                        messageId
                    });
                    return Promise.reject('Could not find supplier info, will exit');
                }
                if (!orgModelInstance) {
                    logger.error({
                        message: 'Could not find organisation info, will exit',
                        orgModelId: payload.orgModelId,
                        messageId
                    });
                    return Promise.reject('Could not find organisation info, will exit');
                }
                logger.debug({
                    message: 'Found supplier, org and store info, will create a new report model',
                    storeModelInstance,
                    supplierModelInstance,
                    orgModelInstance,
                    messageId
                });
                toGenerateReorderPoints = orgModelInstance.stockUpReorderPoints;
                var supplierStoreCode = supplierModelInstance.storeIds ? supplierModelInstance.storeIds[payload.storeModelId] : '';
                supplierStoreCode = supplierStoreCode ? '#' + supplierStoreCode : '';
                var TODAYS_DATE = new Date();
                var name = payload.name || storeModelInstance.name + ' - ' + supplierStoreCode + ' ' + supplierModelInstance.name + ' - ' + TODAYS_DATE.getFullYear() + '-' + (TODAYS_DATE.getMonth() + 1) + '-' + TODAYS_DATE.getDate();
                if (payload.reportModelId) {
                    return Promise.resolve({
                        ops: [
                            {
                                _id: payload.reportModelId
                            }
                        ]
                    });
                }
                return db.collection('ReportModel').insertOne({
                    name: name,
                    userModelId: ObjectId(payload.loopbackAccessToken.userId), // explicitly setup the foreignKeys for related models
                    state: REPORT_STATES.PROCESSING,
                    storeModelId: ObjectId(payload.storeModelId),
                    supplierModelId: ObjectId(payload.supplierModelId),
                    orgModelId: ObjectId(payload.orgModelId),
                    deliverFromStoreModelId: ObjectId(payload.warehouseModelId),
                    createdAt: new Date(),
                    updatedAt: new Date()
                });
            })
            .catch(function (error) {
                logger.error({
                    message: 'Could not create a report model',
                    error,
                    messageId
                });
                return Promise.reject('Could not create a report model');
            })
            .then(function (result) {
                reportModel = result.ops[0];
                logger.debug({
                    message: 'Created report model instance for store, will generate new reorder points',
                    result,
                    commandName,
                    messageId
                });
                if (toGenerateReorderPoints) {
                    var generateReorderPointsMSD = require('./../generate-reorder-points/generate-reorder-points-msd');
                    return generateReorderPointsMSD.run(payload, config, taskId, messageId);
                }
                else {
                    logger.debug({
                        message: 'Reorder points calculation set to false for org, will move on',
                        messageId
                    });
                    return Promise.resolve('Reorder points calculation set to false for org, will move on');
                }
            })
            .then(function (response) {
                logger.debug({
                    messageId: messageId,
                    response,
                    message: `Created reorder points, Will look for products belonging to supplier ID ${payload.supplierModelId}`
                });
                // reportModel = response.ops[0];
                return db.collection('ProductModel').aggregate([
                    {
                        $match: {
                            $and: [
                                {
                                    orgModelId: ObjectId(payload.orgModelId)
                                },
                                {
                                    supplierModelId: ObjectId(payload.supplierModelId)
                                }
                            ]
                        }
                    },
                    {
                        $lookup: {
                            from: "CategoryModel",
                            localField: "categoryModelId",
                            foreignField: "_id",
                            as: "categoryModel"
                        }
                    }
                ]).toArray();
            })
            .catch(function (error) {
                logger.error({
                    message: 'Could not fetch supplier products',
                    error,
                    messageId
                });
                return Promise.reject('Could not fetch supplier products');
            })
            .then(function (supplierProducts) {
                productInstances = supplierProducts;
                var productModelIds = _.pluck(supplierProducts, '_id');
                logger.debug({
                    messageId: messageId,
                    message: `Found ${supplierProducts.length} products belonging to supplier ID ${payload.supplierModelId}`
                });
                logger.debug({
                    messageId: messageId,
                    message: `Will look for their inventories for outlet id ${payload.storeModelId}`
                });
                return db.collection('InventoryModel').find({
                    $and: [
                        {
                            orgModelId: ObjectId(payload.orgModelId)
                        },
                        {
                            productModelId: {
                                $in: productModelIds
                            }
                        },
                        {
                            storeModelId: ObjectId(payload.storeModelId)
                        }
                    ]
                }).toArray();
            })
            .catch(function (error) {
                logger.error({
                    message: 'Could not find inventory for products',
                    messageId,
                    error
                });
                return Promise.reject('Could not find inventory for products');
            })
            .then(function (response) {
                try {
                    inventoryInstances = response;
                    logger.debug({
                        messageId: messageId,
                        message: `Found ${inventoryInstances.length} inventories against ${productInstances.length} products`
                    });
                    var rows = [];
                    _.each(productInstances, function (eachProduct) {
                        var useRow = true;

                        var caseQuantity = undefined;
                        if (eachProduct.tags) {
                            var tagsAsCsv = eachProduct.tags.trim();
                            //logger.debug({ tagsAsCsv: tagsAsCsv });
                            var tagsArray = tagsAsCsv.split(',');
                            if (tagsArray && tagsArray.length>0) {
                                _.each(tagsArray, function (tag) {
                                    tag = tag.trim();
                                    if (tag.length>0) {
                                        //logger.debug({ tag: tag });
                                        // http://stackoverflow.com/questions/8993773/javascript-indexof-case-insensitive
                                        var prefix = 'CaseQuantity:'.toLowerCase();
                                        if (tag.toLowerCase().indexOf(prefix) === 0) {
                                            var caseQty = tag.substr(prefix.length);
                                            //logger.debug({ message: `based on a prefix, adding CaseQuantity: ${caseQty}` });
                                            caseQuantity = Number(caseQty);
                                        }
                                        else {
                                            //logger.debug({ message: 'ignoring anything without a prefix' });
                                        }
                                    }
                                });
                            }
                        }
                        var inventory = _.find(inventoryInstances, function (eachInventory) {
                            return eachInventory.productModelId.toString() === eachProduct._id.toString();
                        });
                        if (!inventory) {
                            useRow = false;
                        }
                        else {
                            var quantityOnHand = Number(inventory.inventory_level);
                            var desiredStockLevel, thresholdStockLevel;
                            if (toGenerateReorderPoints) {
                                desiredStockLevel = Number(inventory.stockUpReorderPoint);
                                thresholdStockLevel = Number(inventory.stockUpReorderThreshold);
                            }
                            else {
                                desiredStockLevel = Number(inventory.reorder_point);
                            }
                            var orderQuantity = 0;
                            if (quantityOnHand<0) {
                                logger.debug({
                                    messageId: messageId,
                                    message: `TODO: how should negative inventory be handled? DSL minus QOH w/ a negative QOH will lead to a positive! Example: 100 - (-2) = 102`
                                });
                            }
                            if (!_.isNaN(desiredStockLevel) && _.isNumber(desiredStockLevel)) {
                                if (!toGenerateReorderPoints) {
                                    orderQuantity = desiredStockLevel - quantityOnHand;
                                }
                                else {
                                    if(quantityOnHand < thresholdStockLevel) {
                                        orderQuantity = desiredStockLevel - quantityOnHand;
                                    }
                                }
                                if (orderQuantity>0) {
                                    useRow = true;
                                    if (caseQuantity) {
                                        if ((orderQuantity % caseQuantity) === 0) {
                                            //logger.debug({ message: 'NO-OP: orderQuantity is already a multiple of caseQuantity' });
                                        }
                                        else {
                                            orderQuantity = Math.ceil(orderQuantity / caseQuantity) * caseQuantity;
                                        }
                                    }
                                }
                                else {
                                    logger.debug({
                                        messageId: messageId,
                                        message: `do not waste time on negative or zero orderQuantity ${eachProduct.sku}`
                                    });
                                    useRow = false;
                                }
                            }
                            else {
                                logger.debug({
                                    message: 'Could not fetch stockup reorder point',
                                    eachProduct,
                                    inventory,
                                    messageId
                                });
                                desiredStockLevel = undefined;
                                orderQuantity = undefined;
                                useRow = true;
                            }
                        }

                        if (useRow) {
                            var categoryName = eachProduct.categoryModel && eachProduct.categoryModel.length ? eachProduct.categoryModel[0].name : 'No Category';
                            let isApproved = supplier.reportDefaultState ? approvedStates.includes(supplier.reportDefaultState) : false;
                            let isFulfilled = supplier.reportDefaultState ? fulfilledStates.includes(supplier.reportDefaultState) : false;
                            let isReceived = supplier.reportDefaultState ? receivedStates.includes(supplier.reportDefaultState) : false;
                            var row = {
                                productModelId: ObjectId(eachProduct._id),
                                productModelName: eachProduct.name, //need for sorting
                                productModelSku: eachProduct.sku, //need for sorting
                                storeInventory: quantityOnHand,
                                desiredStockLevel: desiredStockLevel,
                                orderQuantity: orderQuantity,
                                originalOrderQuantity: orderQuantity,
                                fulfilledQuantity: isFulfilled ? orderQuantity : 0,
                                receivedQuantity: isReceived ? orderQuantity : 0,
                                caseQuantity: caseQuantity,
                                supplyPrice: eachProduct.supply_price,
                                supplierModelId: ObjectId(eachProduct.supplierModelId),
                                categoryModelId: ObjectId(eachProduct.categoryModelId),
                                binLocation: eachProduct.binLocation,
                                categoryModelName: categoryName,  //need for sorting
                                approved: isApproved,
                                fulfilled: isFulfilled,
                                received: isReceived,
                                reportModelId: ObjectId(reportModel._id),
                                userModelId: ObjectId(payload.loopbackAccessToken.userId),
                                createdAt: new Date(),
                                orgModelId: ObjectId(payload.orgModelId)
                            };
                            rows.push(row);
                            logger.debug({messageId: messageId, row: row});
                        }
                        else {
                            logger.debug({
                                messageId: messageId,
                                message: `skipping ${eachProduct.sku}`
                            });
                        }
                    });

                    logger.debug({
                        messageId: messageId,
                        message: `Saving total line items ${rows.length}`
                    });
                }
                catch (e) {
                    logger.error({
                        message: 'Error in generating line items',
                        e,
                        messageId
                    });
                }
                if (rows.length) {
                    return db.collection('StockOrderLineitemModel').insertMany(rows);
                }
                else {
                    return Promise.resolve('No items to insert');
                }
            })
            .catch(function (error) {
                logger.error({
                    message: 'Could not save line items to db',
                    messageId,
                    error
                });
                return Promise.resolve('ERROR_REPORT');
            })
            .then(function (response) {
                logger.debug({
                    messageId: messageId,
                    message: `Done updating the stock order line item models with required product and inventory info`,
                    response
                });
                if (response === 'ERROR_REPORT') {
                    return Promise.all([
                        db.collection('ReportModel').updateOne({_id: ObjectId(reportModel._id)}, {
                            $set: {
                                state: REPORT_STATES.PROCESSING_FAILURE
                            }
                        }),
                        response
                    ]);
                }
                else {
                    //If no default state is specified then set it to generated
                    if (!supplier.reportDefaultState) {
                        logger.debug({
                            messageId: messageId,
                            message: `Will change the status of report to ${REPORT_STATES.GENERATED}`
                        });
                        return Promise.all([
                            db.collection('ReportModel').updateOne({_id: ObjectId(reportModel._id)}, {
                                $set: {
                                    state: REPORT_STATES.GENERATED
                                }
                            }),
                            response
                        ]);
                        //If order is not yet sent to supplier or order is has not been received yet
                    }else if (notApprovedStates.includes(supplier.reportDefaultState) ||
                        notReceivedStates.includes(supplier.reportDefaultState)
                    ) {
                        logger.debug({
                            messageId: messageId,
                            message: `Default Supplier State Found , Will change the status of report to ${supplier.reportDefaultState}`
                        });
                        return Promise.all([
                            db.collection('ReportModel').updateOne({_id: ObjectId(reportModel._id)}, {
                                $set: {
                                    state: supplier.reportDefaultState
                                }
                            }),
                            response
                        ]);
                    }else {
                        logger.debug({
                            messageId: messageId,
                            supplierDefaultState: supplier.reportDefaultState,
                            message: `Will call generate-purchase-order-vend worker to reach target state of ${supplier.reportDefaultState}`
                        });
                        let generatePurchaseOrderVend = require('../generate-purchase-order-vend/generate-purchase-order-vend');
                        let purchaseOrderPayload = {
                            loopbackAccessToken: payload.loopbackAccessToken,
                            orgModelId: payload.orgModelId,
                            reportModelId: reportModel._id
                        };
                        return Promise.all([
                            generatePurchaseOrderVend.run(purchaseOrderPayload, config, taskId, messageId),
                            response
                        ]);

                    }
                }
            })
            .catch(function (error) {
                logger.error({
                    message: 'Could not update report status',
                    error,
                    messageId
                });
                return Promise.reject('Could not update report status');
            })
            .then(function ([updateResult, result]) {
                if (result === 'ERROR_REPORT') {
                    return Promise.reject('Error while processing order');
                }else if (supplier.reportDefaultState === REPORT_STATES.COMPLETE) {
                    return fulfillAndReceiveConsignment(Object.assign(payload, {reportModel}, {supplier}, {db}), config, taskId, messageId);
                }else {
                    return Promise.resolve(updateResult);

                }
            })
            .then(function (response) {
                var options = {
                    method: 'POST',
                    uri: utils.PUBLISH_URL,
                    json: true,
                    headers: {
                        'Authorization': payload.loopbackAccessToken.id
                    },
                    body: new utils.Notification(
                        utils.workerType.GENERATE_STOCK_ORDER_VEND,
                        payload.eventType,
                        utils.workerStatus.SUCCESS,
                        {success: true, reportModelId: payload.reportModelId},
                        payload.callId
                    )

                };
                logger.debug({
                    message: 'Generated stock order, will send the status to worker',
                    response,
                    messageId,
                    options
                });
                return rp(options);
            })
            .catch(function (error) {
                logger.error({
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
                        utils.workerType.GENERATE_STOCK_ORDER_VEND,
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
                    messageId
                });
                var slackMessage = 'Generate stock order MSD Worker failed for storeModelId ' + payload.storeModelId + '\n taskId' +
                    ': ' + taskId + '\nMessageId: ' + messageId;
                utils.sendSlackMessage('Worker failed', slackMessage, false);
                return rp(options);
            })
            .catch(function (error) {
                logger.error({
                    message: 'Could not send status to server',
                    error,
                    messageId
                });
                return Promise.reject('Could not send status to server')
            })
            .then(function (res) {
                logger.debug({
                    message: 'Successfully sent worker status to server',
                    res,
                    messageId
                });
                return Promise.resolve('Successfully sent worker status to server');
            })
            .catch(function (error) {
                logger.error({
                    messageId: messageId,
                    message: 'last dot-catch block',
                    err: error
                });
                return Promise.reject(error);
            });
    }
    catch (e) {
        logger.error({messageId: messageId, message: 'last catch block', err: e});
        throw e; // use `throw` for `catch()` and `reject` for `.catch()`
    }

};

module.exports = {
    run: runMe
};
