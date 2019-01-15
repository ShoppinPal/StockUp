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
const MSDUtil = require('./../../jobs/utils/msd.js');
const Promise = require('bluebird');
const commandName = path.basename(__filename, '.js'); // gives the filename without the .js extension
const TODAYS_DATE = new Date();
const rp = require('request-promise');
var runMe = function (payload, config, taskId, messageId) {

    var orgModelId = payload.orgModelId;
    var reportModelId = payload.reportModelId;
    var createdTransferOrder, stockOrderLineItemModels;
    try {
        // Global variable for logging

        logger.debug({
            commandName: commandName,
            argv: process.argv,
            env: process.env,
            orgModelId,
            reportModelId,
            messageId
        });

        try {
            logger.debug({
                commandName: commandName,
                message: 'This worker will push a transfer order to MSD',
                orgModelId,
                reportModelId,
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
                        message: 'Connected to Mongo DB, will look for report model',
                        commandName,
                        messageId
                    });
                    return db.collection('ReportModel').findOne({
                        _id: ObjectId(reportModelId)
                    })
                })
                .catch(function (error) {
                    logger.error({
                        message: 'Could not find report model instance',
                        reportModelId,
                        error,
                        commandName,
                        messageId
                    });
                    return Promise.reject('Could not find report model instance');
                })
                .then(function (reportModelInstance) {
                    logger.debug({
                        message: 'Found report model instance, will look for its store',
                        reportModelInstance,
                        commandName,
                        messageId
                    });
                    return db.collection('StoreModel').findOne({
                        _id: ObjectId(reportModelInstance.storeModelId)
                    });
                })
                .catch(function (error) {
                    logger.error({
                        message: 'Could not find store model instance',
                        reportModelId,
                        error,
                        commandName,
                        messageId
                    });
                    return Promise.reject('Could not find store model instance');
                })
                .then(function (storeModelInstance) {
                    logger.debug({
                        message: 'Found store model instance',
                        storeModelInstance,
                        commandName,
                        messageId
                    });
                    var transferOrder = {
                        "dataAreaId": "1201",
                        "ReceivingAddressLongitude": 0,
                        "ReceivingAddressCountryRegionId": "MYS",
                        "ATPBackwardDemandTimeFenceDays": 0,
                        "ReceivingAddressCountryRegionISOCode": "MY",
                        "ShippingAddressDescription": "Port Klang",
                        "IsShippingAddressPrivate": "No",
                        "IsATPIncludingPlannedOrders": false,
                        "DeliveryTermsCode": "",
                        "ATPDelayedDemandOffsetDays": 0,
                        "ReceivingBuildingCompliment": "",
                        "ShippingBuildingCompliment": "",
                        "TransferOrderPromisingMethod": "None",
                        "ATPDelayedSupplyOffsetDays": 0,
                        "RequestedShippingDate": new Date(),
                        "RequestedReceiptDate": new Date(),
                        "ShippingAddressDistrictName": "",
                        "ShippingFreightZone": "",
                        "ReceivingContactPersonnelNumber": "",
                        "IntrastatTransportModeCode": "",
                        "IntrastatTransactionCode": "",
                        "ShippingAddressCityInKana": "",
                        "ShippingAddressCountyId": "",
                        "ShippingAddressTimeZone": null,
                        "IntrastatStatisticsProcedureCode": "",
                        "ATPTimeFenceDays": 0,
                        "ShippingAddressCountryRegionId": "MYS",
                        "IntrastatSpecialMovementCode": "",
                        "DeliveryModeCode": "",
                        "TransportationModeId": "",
                        "ShippingCarrierServiceGroupId": "",
                        "ReceivingAddressDunsNumber": "",
                        "ReceivingAddressStreetInKana": "",
                        "IsReceivingAddressPrivate": "No",
                        "ReceivingAddressPostBox": "",
                        "ShippingCarrierId": "",
                        "IntrastatPortId": "",
                        "ReceivingAddressStreetNumber": "",
                        "ShippingFreightCompany": "None",
                        "ATPBackwardSupplyTimeFenceDays": 0,
                        "ReceivingWarehouseId": storeModelInstance.storeNumber,
                        "ShippingAddressDunsNumber": "",
                        "ShippingAddressLatitude": 0,
                        "ReceivingAddressCityInKana": "",
                        "ReceivingAddressLatitude": 0,
                        "ShippingAddressPostBox": "",
                        "ShippingContactPersonnelNumber": "",
                        "OverrideFEFODateControl": "No",
                        "ReceivingAddressDescription": storeModelInstance.name,
                        "ShippingAddressCountryRegionISOCode": "MY",
                        "ReceivingAddressDistrictName": "",
                        "ShippingWarehouseId": "9991006",
                        "ShippingAddressZipCode": "42000",
                        "AreLinesAutomaticallyReservedByDefault": "No",
                        "ShippingAddressStreetNumber": "",
                        "ShippingCarrierServiceId": "",
                        "ShippingAddressStreetInKana": "",
                        "ShippingAddressLongitude": 0,
                        "ReceivingAddressCountyId": ""
                    };
                    return MSDUtil.pushMSDData(db, orgModelId, 'TransferOrderHeaders', transferOrder, {
                        messageId,
                        commandName
                    });
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
                    createdTransferOrder = result;
                    logger.debug({
                        message: 'Created transfer order header in MSD, will look for StockOrderLineitemModels now',
                        result,
                        commandName,
                        messageId
                    });
                    return db.collection('StockOrderLineitemModel').find({
                        $and: [{
                            reportModelId: ObjectId(reportModelId)
                        }, {
                            approved: true
                        }]
                    }).toArray();
                })
                .catch(function (error) {
                    logger.error({
                        commandName,
                        error,
                        message: 'Could not find stockOrderLineitemModels',
                        messageId
                    });
                    return Promise.reject('Could not find stockOrderLineitemModels');
                })
                .then(function (stockOrderLineItemModelInstances) {
                    stockOrderLineItemModels = stockOrderLineItemModelInstances;
                    var productModelIds = _.map(stockOrderLineItemModels, function (eachStockOrderLineItemModel) {
                        return ObjectId(eachStockOrderLineItemModel.productModelId);
                    });
                    logger.debug({
                        message: 'Found these approved line items, will find their product models',
                        messageId,
                        commandName,
                        productModelIds,
                        count: stockOrderLineItemModels.length
                    });
                    return db.collection('ProductModel').find({
                        _id: {
                            $in: productModelIds
                        }
                    }).toArray();
                })
                .catch(function (error) {
                    logger.error({
                        message: 'Could not find product model instances',
                        reportModelId,
                        error,
                        commandName,
                        messageId
                    });
                    return Promise.reject('Could not find product model instances');
                })
                .then(function (productModelInstances) {
                    logger.debug({
                        message: 'Found product model instances',
                        count: productModelInstances.length,
                        sampleProduct: productModelInstances[0],
                        messageId,
                        commandName
                    });
                    var lineItemsToPush = [], correspondingProduct;
                    for (var i = 0; i<stockOrderLineItemModels.length; i++) {
                        for (var j = 0; j<productModelInstances.length; j++) {
                            if (productModelInstances[j]._id.toString() === stockOrderLineItemModels[i].productModelId.toString()) {
                                correspondingProduct = productModelInstances[j];
                            }
                        }
                        if (correspondingProduct) {
                            lineItemsToPush.push({
                                "dataAreaId": "1201",
                                "TransferOrderNumber": createdTransferOrder.TransferOrderNumber,
                                "ProductConfigurationId": correspondingProduct.configurationId,
                                "IntrastatCostAmount": 0,
                                "ATPBackwardDemandTimeFenceDays": 0,
                                "IsATPIncludingPlannedOrders": false,
                                "ATPDelayedDemandOffsetDays": 0,
                                "OriginStateId": "",
                                "TransferOrderPromisingMethod": "None",
                                "ATPDelayedSupplyOffsetDays": 0,
                                "RequestedShippingDate": new Date(),
                                "ProductSizeId": correspondingProduct.sizeId,
                                "RequestedReceiptDate": new Date(),
                                "ItemNumber": correspondingProduct.api_id,
                                "AllowedUnderdeliveryPercentage": 100,
                                "IsAutomaticallyReserved": "No",
                                "IntrastatTransactionCode": "",
                                "IntrastatTransportModeCode": "",
                                "IntrastatStatisticsProcedureCode": "",
                                "ATPTimeFenceDays": 0,
                                "IntrastatSpecialMovementCode": "",
                                "TransferQuantity": stockOrderLineItemModels[i].orderQuantity,
                                "IntrastatStatisticalValue": 0,
                                "OrderedInventoryStatusId": "",
                                "IntrastatPortId": "",
                                "OriginCountryRegionId": "",
                                "ATPBackwardSupplyTimeFenceDays": 0,
                                "ItemBatchNumber": "",
                                "OverrideFEFODateControl": "No",
                                "OriginCountyId": "",
                                "ProductColorId": correspondingProduct.colorId,
                                "WillProductReceivingCrossDockProducts": "No",
                                "ReceivingLedgerDimensionDisplayValue": "",
                                "IntrastatCommodityCode": "",
                                "ShippingLedgerDimensionDisplayValue": "",
                                "ShippingWarehouseLocationId": "9991006",
                                "TransferCatchWeightQuantity": 0,
                                "AllowedOverdeliveryPercentage": 100,
                                "ProductStyleId": "NA"
                            });
                        }
                        else {
                            logger.debug({
                                message: 'Could not find corresponding product model for this line item, will skip it',
                                lineItem: stockOrderLineItemModels[i],
                                messageId,
                                commandName
                            });
                        }
                    }
                    logger.debug({
                        message: 'Created line items data to push',
                        count: lineItemsToPush.length,
                        lineItems: _.pick(lineItemsToPush, 'ItemNumber', 'TransferQuantity'),
                        messageId,
                        commandName
                    });
                    return MSDUtil.pushMSDDataInBatches(db, orgModelId, 'TransferOrderLines', lineItemsToPush, {
                        messageId,
                        commandName
                    });
                })
                .catch(function (error) {
                    logger.error({
                        message: 'Could not push line items to transfer order in MSD',
                        error,
                        commandName,
                        messageId,
                        reportModelId
                    });
                    return Promise.reject('Could not push line items to transfer order in MSD');
                })
                .then(function (result) {
                    logger.debug({
                        message: 'Pushed transfer order lines to transfer order in MSD, will update Report Model',
                        reportModelId,
                        commandName,
                        messageId,
                        result
                    });
                    return db.collection('ReportModel').updateOne({
                        _id: ObjectId(reportModelId)
                    }, {
                        $set: {
                            transferOrderNumber: createdTransferOrder.TransferOrderNumber,
                            transferOrderCount: result
                        }
                    });
                })
                .catch(function (error) {
                    logger.error({
                        message: 'Could not update report model with transfer order number',
                        messageId,
                        commandName,
                        error,
                        reportModelId
                    });
                    return Promise.reject('Could not update report model with transfer order number');
                })
                .then(function (result) {
                    logger.debug({
                        message: 'Updated transfer order status in report model',
                        result,
                        commandName,
                        result,
                        reportModelId
                    });
                    return Promise.resolve('Updated transfer order status in report model');
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
                        message: 'Could not generate transfer order, will send the following status',
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
                    var slackMessage = 'Generate transfer order MSD Worker failed for reportModelId ' + reportModelId + '\n taskId' +
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
    var reportModel, totalRows;
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
            }).toArray()
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
                message: 'Found inventory model instances with inventory level less than reorder threshold',
                count: inventoryModelInstances.length,
                commandName,
                storeModelId,
                orgModelId,
                messageId
            });
            var lineItemsToOrder = [];
            for (var i = 0; i<inventoryModelInstances.length; i++) {
                lineItemsToOrder.push({
                    reportModelId: ObjectId(reportModel._id),
                    productModelId: inventoryModelInstances[i].productModelId,
                    storeModelId: ObjectId(storeModelId),
                    orgModelId: ObjectId(orgModelId),
                    orderQuantity: inventoryModelInstances[i].reorder_point - inventoryModelInstances[i].inventory_level,
                    fulfilledQuantity: inventoryModelInstances[i].reorder_point - inventoryModelInstances[i].inventory_level,
                    state: 'unboxed',
                    approved: false
                });
            }
            totalRows = lineItemsToOrder.length;
            logger.debug({
                message: 'Prepared to push these items to stock order',
                lineItemsToOrder,
                commandName,
                messageId
            });
            return db.collection('StockOrderLineitemModel').insertMany(lineItemsToOrder);
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
                    error,
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
                    message: 'Inserted items into report model successfully, will update report model',
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
