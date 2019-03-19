var SUCCESS = 0;
var FAILURE = 1;

var REPORT_EMPTY = 'report_empty';
var MANAGER_NEW_ORDERS = 'manager_new_orders';
var MANAGER_IN_PROCESS = 'manager_in_process';
var WAREHOUSE_FULFILL = 'warehouse_fulfill';
var MANAGER_RECEIVE = 'manager_receive';
var REPORT_COMPLETE = 'report_complete';

var BOXED = 'boxed';

const logger = require('sp-json-logger');


var runMe = function (payload, config, taskId, messageId) {

    try {
        var Promise = require('bluebird');
        var _ = require('underscore');
        var dbUrl = process.env.DB_URL;
        var MongoClient = require('mongodb').MongoClient;
        var ObjectId = require('mongodb').ObjectID;
        var fs = require('fs');
        var utils = require('./../../jobs/utils/utils.js');
        var path = require('path');
        var db = null; //database connected
        var lineItemInstances, productInstances, inventoryInstances;

        // Global variable for logging
        var commandName = path.basename(__filename, '.js'); // gives the filename without the .js extension

        logger.debug({
            messageId: messageId,
            commandName: commandName,
            payload: payload,
            config: config,
            taskId: taskId,
            argv: process.argv
        });

        process.env['User-Agent'] = taskId + ':' + messageId + ':' + commandName + ':' + payload.domainPrefix;

        return utils.savePayloadConfigToFiles(payload)
            .then(function () {
                return MongoClient.connect(dbUrl, {
                    promiseLibrary: Promise
                });
            })
            .then(function (dbInstance) {
                db = dbInstance;
                //TODO: remove these relative paths
                var nconf = require('./../../node_modules/nconf/lib/nconf');
                nconf.file('client', {file: 'config/client.json'})
                //.file('settings', { file: 'config/settings.json' }) // NOTE: useful for quicker testing
                    .file('oauth', {file: 'config/oauth.json'});

                //TODO: write authentication code here

                logger.debug({messageId: messageId, commandName: commandName, nconf: nconf.get()});
                if (payload.reportId === undefined || payload.reportId === null) {
                    logger.debug({
                        messageId: messageId,
                        commandName: commandName,
                        message: 'Report not found in payload'
                    });
                    return Promise.reject('Report not found');
                }
                else {
                    logger.debug({
                        messageId: messageId,
                        commandName: commandName,
                        message: 'Will look for skus included in the report'
                    });
                    return db.collection('StockOrderLineitemModel').find({
                        reportId: ObjectId(payload.reportId) //store config model check not needed as the reportId is unique and belongs to storeConfigModel
                    }).toArray();
                }
            })
            .then(function (lineItems) {
                lineItemInstances = lineItems;
                if (lineItems.length>0) { // if rows already exist, it means the raw data was imported already
                    logger.debug({
                        messageId: messageId,
                        commandName: commandName,
                        message: 'Will look for products in db against the SKUs',
                        skus: _.pluck(lineItems, 'sku')
                    });
                    var productSKUs = _.pluck(lineItems, 'sku');
                    return db.collection('ProductModel').find({
                        sku: {
                            $in: productSKUs
                        }
                    }).toArray();
                }
                else {
                    logger.debug({
                        messageId: messageId,
                        commandName: commandName,
                        message: 'No line items found for the report, will create line items based on reorder_point'
                    });
                    return Promise.reject(commandName + ' > raw data has not been imported yet');
                }
            })
            .then(function (response) {
                productInstances = response;
                logger.debug({
                    messageId: messageId,
                    commandName: commandName,
                    message: `Found ${productInstances.length} products against ${lineItemInstances.length} line items`
                });
                if (productInstances.length>lineItemInstances.length) {
                    logger.debug({
                        messageId: messageId,
                        commandName: commandName,
                        message: 'There are duplicate SKUs in the database, will ignore them'
                    });
                }
                else if (productInstances.length<lineItemInstances.length) {
                    logger.debug({
                        messageId: messageId,
                        commandName: commandName,
                        message: 'Some SKUs were not found, will mark them as unboxed'
                    });
                }
                var productVendIds = _.pluck(productInstances, 'api_id');
                logger.debug({messageId: messageId, commandName: commandName, productVendIds: productVendIds});
                return db.collection('InventoryModel').find({
                    $and: [
                        {
                            product_id: {
                                $in: productVendIds
                            }
                        },
                        {
                            outlet_id: payload.outletId //TODO: track using payload.storeModelId instead for ids consistency, but this works too
                        }
                    ]
                }).toArray();
            })
            .then(function (response) {
                inventoryInstances = response;
                logger.debug({
                    messageId: messageId,
                    commandName: commandName,
                    message: `Found ${inventoryInstances.length} inventories against ${lineItemInstances.length} line items`
                });
                if (productInstances.length !== inventoryInstances.length) {
                    logger.debug({
                        messageId: messageId,
                        commandName: commandName,
                        message: 'Could not find all matching inventories, but imported orders do not care about inventory for now'
                    });
                }
                return Promise.map(lineItemInstances, function (eachLineItem) {
                    var correspondingProduct = _.find(productInstances, function (eachProduct) {
                        return eachProduct.sku === eachLineItem.sku;
                    });
                    var correspondingInventory = _.filter(inventoryInstances, function (eachInventory) {
                        return eachInventory.outlet_id === payload.outletId;
                    });
                    logger.debug({
                        messageId: messageId,
                        commandName: commandName,
                        message: `Updating productId and inventoryId for ${eachLineItem.sku}`
                    });
                    if (correspondingProduct) {
                        return db.collection('StockOrderLineitemModel').updateOne({_id: ObjectId(eachLineItem._id)},
                            {
                                $set: {
                                    productModelId: correspondingProduct._id || null,
                                    productId: correspondingProduct.api_id || null,
                                    inventoryModelId: correspondingInventory._id || null,
                                    fulfilledQuantity: eachLineItem.fulfilledQuantity || eachLineItem.orderQuantity,
                                    supplyPrice: correspondingProduct.supply_price,
                                    state: BOXED,// boxed by default if valid sku
                                    boxNumber: 1 // boxed together by default
                                }
                            });
                    }
                    else {
                        //do not box, because the sku is invalid
                        return db.collection('StockOrderLineitemModel').updateOne({_id: ObjectId(eachLineItem._id)},
                            {
                                $set: {
                                    fulfilledQuantity: eachLineItem.fulfilledQuantity || eachLineItem.orderQuantity,
                                }
                            });
                    }
                });
            })
            .then(function (response) {
                logger.debug({
                    messageId: messageId,
                    commandName: commandName,
                    message: 'Done updating the stock order line item models with required product and inventory info',
                    result: response.result
                });
                logger.debug({
                    messageId: messageId,
                    commandName: commandName,
                    message: 'Will change the status of report to warehouse fulfilment'
                });
                return db.collection('ReportModel').updateOne({_id: ObjectId(payload.reportId)}, {
                    $set: {
                        state: WAREHOUSE_FULFILL,
                        totalRows: lineItemInstances.length
                    }
                });
            })
            .then(function (response) {
                logger.debug({
                    messageId: messageId,
                    commandName: commandName,
                    message: 'Updated the report status, will exit worker now',
                    result: response.result
                });
                return Promise.resolve();
            })
            .catch(function (error) {
                logger.error({
                    messageId: messageId,
                    commandName: commandName,
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
