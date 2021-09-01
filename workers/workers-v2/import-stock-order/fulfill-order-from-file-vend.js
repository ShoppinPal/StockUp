const path = require('path');
const commandName = path.basename(__filename, '.js'); // gives the filename without the .js extension
const logger = require('sp-json-logger')({fileName: 'workers:workers-v2:' + commandName});
const excel = require('excel-stream');
const Promise = require('bluebird');
const _ = require('underscore');
const aws = require('aws-sdk');
const ObjectId = require('mongodb').ObjectID;
const utils = require('../../jobs/utils/utils.js');
const REPORT_STATES = utils.REPORT_STATES;
const createNewOrders = require('./create-new-orders').createNewOrders;
// Constants
const SKU_MATCH_CONFIDENCE_RATIO = 0.8 // 80% Above match
const NO_MATCH_FOUND = 'NO_MATCH_FOUND';

/**
 * findClosestReportMatchBySku
 * - Searches the found report models and compares by sku
 * @param db - Mongo Connection
 * @param eachOrder - Splitted Order
 * @param matchingReportModels - matching Store<>Supplier in DB
 * @param messageId - SQS Message ID
 * @returns {*} - Matched Report Instance
 * @throws NoMatchFound
 */
function findClosestReportMatchBySku(db, eachOrder, matchingReportModels, messageId) {
    logger.debug({
        message: 'Will look match based on sku to resolve conflict',
        eachOrder,
        matchingReportModels,
        functionName: 'findClosestReportMatchBySku',
        messageId
    });
    let maxMatchRatio = 0, matchedReportModel;
    return Promise.map(matchingReportModels, function (eachReportModel) {
           return db.collection('StockOrderLineitemModel').find({
               reportModelId: eachReportModel._id,
               approved: true

           })
               .project({ productModelSku: 1})
               .toArray()
               .then(function (reportLineItems) {
                   // Get SKU Names
                   const reportModelSkus = _.pluck(reportLineItems, 'productModelSku');
                   const splittedOrderSkus = _.pluck(eachOrder.lineItems, 'productModelSku');
                   // Get common skus
                   const similarItemsCount = _.intersection(reportModelSkus, splittedOrderSkus).length;
                   const totalItemsCount = _.union(reportModelSkus, splittedOrderSkus).length;
                   // Calculate match %
                   const matchRatio = similarItemsCount /totalItemsCount;
                   if (matchRatio > maxMatchRatio) {
                       maxMatchRatio = matchRatio;
                       matchedReportModel = eachReportModel;
                   }
                   logger.debug({
                       message: 'Calculated Match %',
                       maxMatchRatio,
                       matchRatio,
                       reportModelSkus,
                       splittedOrderSkus,
                       similarItemsCount,
                       totalItemsCount,
                       functionName: 'findClosestReportMatchBySku',
                       messageId
                   });
               });
    }).then(function () {
        if (maxMatchRatio > SKU_MATCH_CONFIDENCE_RATIO) {
            return Promise.resolve(matchedReportModel);
        } else {
            return Promise.resolve(NO_MATCH_FOUND);
        }
    });
}

/**
 * pushItemsToVend
 * - Pushes the items that were not already pushed to vend
 * @param db - Mongo Client
 * @param reportModel - report
 * @param messageId - SQL Id
 * @returns {Promise<T>} - Not Significant
 */
function pushItemsToVend(db, reportModel, messageId) {
    var storeModelInstance, supplierModelInstance, stockOrderLineItemModels;
    return Promise.resolve()
        .then(function () {
            logger.debug({
                message: 'will look for store and supplier model',
                reportModel,
                messageId
            });
            return Promise.all([
                db.collection('StoreModel').findOne({
                    _id: ObjectId(reportModel.storeModelId)
                }),
                db.collection('SupplierModel').findOne({
                    _id: ObjectId(reportModel.supplierModelId)
                })
            ]);
        })
        .catch(function (error) {
            logger.error({
                message: 'Could not find store, supplier instances',
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

            var aggregationQuery = [
                {
                    $match: {
                        reportModelId: ObjectId(reportModel._id),
                        // If approved & fulfilled
                        fulfilled: true,
                        // if vend product id is not present
                        vendConsignmentProductId: {
                            $exists: false
                        }
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
            return utils.fetchVendToken(db, reportModel.orgModelId, messageId);
        })
        .then(function (token) {
            logger.debug({
                message: 'Fetched vend token, will fetch connection info',
                messageId
            });
            return utils.getVendConnectionInfo(db, reportModel.orgModelId, messageId);
        })
        .then(function (connectionInfo) {
            return Promise.map(stockOrderLineItemModels, function (eachLineItem) {
                return Promise.delay(1000)
                    .then(function () {
                        return utils.createStockOrderLineitemForVend(db, connectionInfo, storeModelInstance, reportModel, eachLineItem, messageId);
                    })
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
                    });
            }, {concurrency: 1});
        })
        .catch(function (error) {
            logger.error({
                message: 'Could not push line items to purchase order in Vend',
                error,
                commandName,
                messageId,
                reportModel
            });
            return Promise.reject('Could not push line items to purchase order in Vend');
        });
}

/**
 * fulfillLineItemsForReport
 * - Check if for each item in splitted order a line item exists
 * - if exists then update the quantity
 * - else insert lineitem & push to vend
 * @param db - Mongo Client
 * @param eachOrder - Splitted Order from file
 * @param reportModel - matched report model
 * @param messageId - SQS ID
 * @returns {Promise<any>}
 */
function fulfillLineItemsForReport(db, eachOrder, reportModel, messageId) {
    logger.debug({
        message: 'Will Mark items as fulfilled',
        eachOrder,
        reportModel,
        functionName: 'fulfillLineItemsForReport',
        messageId
    });
    var batch = db.collection('StockOrderLineitemModel').initializeUnorderedBulkOp();
    var pushToVend = false;
    return Promise.map(eachOrder.lineItems, function (generatedLineItem) {
                return db.collection('StockOrderLineitemModel').findOne({
                    reportModelId: reportModel._id,
                    productModelSku: generatedLineItem.productModelSku
                })
                .then(function (lineItem) {
                    if (!lineItem) {
                        logger.debug({
                            message: 'line item doesnot exist need to push to vend',
                            lineItem,
                            generatedLineItem,
                            functionName: 'fulfillLineItemsForReport',
                            messageId
                        });
                        pushToVend = true;
                        return batch.insert(
                            Object.assign({},
                                generatedLineItem,
                                {
                                    orderQuantity: 0,
                                    fulfilledQuantity: generatedLineItem.fulfilledQuantity,
                                    fulfilled: generatedLineItem.fulfilledQuantity > 0,
                                    approved: true,
                                    reportModelId: reportModel._id
                                }
                            )
                        );
                    }

                    // trying to fulfill not approved item , need to push to vend
                    if (!lineItem.approved){
                        pushToVend = true;
                    }
                    logger.debug({
                        message: 'Found line item to fulfill, will update quantities',
                        lineItem,
                        generatedLineItem,
                        functionName: 'fulfillLineItemsForReport',
                        messageId
                    });
                    return batch.find({
                        reportModelId: reportModel._id,
                        productModelSku: generatedLineItem.productModelSku
                    }).updateOne({
                        $set: {
                            approved: true,
                            fulfilledQuantity: generatedLineItem.fulfilledQuantity,
                            fulfilled: generatedLineItem.fulfilledQuantity > 0,
                            updatedAt: new Date()
                        }
                    });

                });
        })
        .then(function (){
            logger.debug({
                message: 'Will set fulfilled false for all unfulfilled items',
                functionName: 'fulfillLineItemsForReport',
                messageId
            });
            return batch.find({
                reportModelId: reportModel._id,
                fulfilled: null,
            }).update({
                $set: {
                    fulfilled: false,
                    fulfilledQuantity: 0
                }
            });
        })
        .then(function () {
            return batch.execute();
        })
        .then(function (){
            logger.debug({
                message: 'Saved Bulk updates to Line Item, will add new items to vend if any',
                functionName: 'fulfillLineItemsForReport',
                messageId
            });
            if (pushToVend) {
                return pushItemsToVend(db, reportModel, messageId);
            } else {
                return Promise.resolve();
            }
        })
        .catch(function (error){
            logger.error({
                message: 'Error Fulfilling Items',
                error,
                functionName: 'fulfillLineItemsForReport',
                messageId
            });
            return Promise.reject(error);
        });


}

/**
 * mapExistingOrdersWithFoundOrders
 * - Maps the splitted orders to report models in Fulfillment Pending state
 * - Step 1 : Find Store<>Supplier pairs, if only 1 we have the match
 * - Step 2: if Multiple Store<>Supplier pairs, then find using 80% sku items match
 * @param db
 * @param orders
 * @param orderConfigModel
 * @param payload
 * @param config
 * @param taskId
 * @param messageId
 * @returns {Promise<any>}
 */
function mapExistingOrdersWithFoundOrders(db, orders, orderConfigModel, payload, config, taskId, messageId) {
    let fulfilledReportCount = 0,
        matchNotFound = 0,
        cannotFulfill = 0,
        matchedReports = [];
    return Promise.map(orders, function (eachOrder) {
            let supplierModelId, storeModelId, matchedReportModel;
            return Promise.delay(1000)
                .then(function (){
                    supplierModelId = eachOrder.supplierModelId;
                    storeModelId = eachOrder.storeModelId;
                    logger.debug({
                        message: 'Will look for orders in Fulfillment pending with store & supplier pair',
                        supplierModelId,
                        storeModelId,
                        messageId
                    });
                    const fulfillingStates = [
                        REPORT_STATES.FULFILMENT_PENDING,
                        REPORT_STATES.FULFILMENT_IN_PROCESS,
                        REPORT_STATES.FULFILMENT_FAILURE,
                    ];
                    return db.collection('ReportModel').find({
                        storeModelId: storeModelId,
                        supplierModelId: supplierModelId,
                        state: {
                            $in:fulfillingStates
                        },
                        deletedAt: { $exists: false }
                    })
                        // get Latest at top
                        .sort({ createdAt: -1 })
                        .toArray();
                })
                .catch(function (error){
                    logger.error({
                        message: 'Cannot find matching report models',
                        eachOrder,
                        error,
                        supplierModelId,
                        storeModelId,
                        messageId
                    });
                    return Promise.reject('Cannot find matching report models')
                })
                .then(function (matchingReportModels){
                    logger.debug({
                        message: 'Found report models for this pair of store & supplier',
                        supplierModelId,
                        storeModelId,
                        matchingReportModels,
                        messageId
                    });
                    if (matchingReportModels.length === 0) {
                        matchNotFound++;
                        logger.debug({
                            message: 'No matching report found',
                            eachOrder,
                            supplierModelId,
                            storeModelId,
                            messageId
                        });
                        return Promise.resolve(NO_MATCH_FOUND);
                    }else if (matchingReportModels.length > 1) {
                        logger.debug({
                            message: 'Found more than one matching reports, will look for line items match',
                            supplierModelId,
                            storeModelId,
                            matchingReportModels: matchingReportModels.length,
                            messageId
                        });
                        return findClosestReportMatchBySku(db, eachOrder, matchingReportModels, messageId);
                    } else {
                        // One one matching report
                        return Promise.resolve(matchingReportModels[0]);
                    }
                })
                .catch(function (error){
                    logger.error({
                        message: 'Cannot find best match of report model',
                        eachOrder,
                        error,
                        supplierModelId,
                        storeModelId,
                        messageId
                    });
                    return Promise.reject('Cannot find best match of report model');
                })
                .then(function (reportModel){
                    if (reportModel === NO_MATCH_FOUND){
                        return createNewOrders(db, [eachOrder], orderConfigModel, payload, config, taskId, messageId)
                            .then(orders => {
                                matchedReportModel = orders[0];
                                matchedReports.push(orders[0]);
                                return Promise.resolve(orders[0]);
                            });
                    }
                    matchedReportModel = reportModel;
                    matchedReports.push(reportModel);
                    return fulfillLineItemsForReport(db, eachOrder, reportModel, messageId);
                })
                .catch(function (error){
                    cannotFulfill++;
                    logger.error({
                        message: 'Cannot fulfill this report',
                        eachOrder,
                        error,
                        supplierModelId,
                        storeModelId,
                        messageId
                    });
                    if(matchedReportModel && matchedReportModel._id) {
                        // Clean the failed report before aborting further import
                        return db.collection('StockOrderLineitemModel').updateMany({
                            reportModelId: matchedReportModel._id,
                        }, {
                            fulfilledQuantity: 0,
                            fulfilled: null
                        }).then(function () {
                            return Promise.reject('Cannot fulfill this report');
                        });
                    } else {
                        return Promise.resolve(NO_MATCH_FOUND);
                    }
                })
                .then(function (response){
                    if (response !== NO_MATCH_FOUND) {
                        fulfilledReportCount++;
                        logger.debug({
                            message: 'Report Fulfilled Successfully',
                            eachOrder,
                            supplierModelId,
                            storeModelId,
                            messageId,
                            matchedReportModel
                        });
                    }
                })
                ;
        }, {
            concurrency: 1
        })
        .then(function () {
            logger.debug({
                message: 'Updated for all reports',
                messageId,
                fulfilledReportCount,
                cannotFulfill,
                matchNotFound
            });
            return Promise.resolve(matchedReports);
        })
        .catch(function (error){
            logger.error({
                message: 'Cannot run fulfillment on this file',
                error,
                messageId,
                fulfilledReportCount,
                cannotFulfill,
                matchNotFound
            });
            return Promise.reject('Cannot run fulfillment on this file');
        });
}

module.exports = {
    run: mapExistingOrdersWithFoundOrders
};
