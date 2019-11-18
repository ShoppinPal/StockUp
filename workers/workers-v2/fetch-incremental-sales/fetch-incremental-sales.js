const path = require('path');
const commandName = path.basename(__filename, '.js'); // gives the filename without the .js extension
const logger = require('sp-json-logger')({fileName: 'workers:workers-v2:' + commandName});

var runMe = function (vendConnectionInfo, orgModelId, dataObject) {

    var dbUrl = process.env.DB_URL;

    try {
        var utils = require('./../../jobs/utils/utils.js');
        var MongoClient = require('mongodb').MongoClient;
        var ObjectId = require('mongodb').ObjectID;
        var _ = require('underscore');
        var Promise = require('bluebird');
        var vendSdk = require('vend-nodejs-sdk')({}); //kamal: why the {}?
        var db = null; //database connected
        var incrementalSales;
        var maxBatchSize = 1000;

        try {
            // process.env['User-Agent'] = taskId + ':' + messageId + ':' + commandName + ':' + payload.domainPrefix;
            logger.debug({
                orgModelId,
                message: 'This worker will fetch and save incremental sales from vend to Stockup'
            });
            // return utils.savePayloadConfigToFiles(payload)
            return Promise.resolve()
                .then(function () {
                    var argsForSales = vendSdk.args.sales.fetchAllV2();
                    argsForSales.after.value = dataObject.versionsAfter;
                    argsForSales.pageSize.value = 1000;
                    return vendSdk.sales.fetchAllV2(argsForSales, vendConnectionInfo);
                })
                .then(function (fetchedSales) {
                    logger.debug({
                        orgModelId,
                        message: `Found ${fetchedSales.length} new sales, will filter only required data from them`
                    });
                    incrementalSales = fetchedSales;
                    if (!incrementalSales.length) {
                        return Promise.reject('noIncrementalSales');
                    }
                    return MongoClient.connect(dbUrl, {promiseLibrary: Promise});
                })
                .then(function (dbInstance) {
                    logger.debug({
                        orgModelId,
                        message: 'Connected to mongodb database'
                    });
                    db = dbInstance;
                    return Promise.all([
                        db.collection('StoreModel').find({
                            "orgModelId": ObjectId(orgModelId)
                        }).toArray()
                    ]);
                })
                .then(function (response) {
                    // var productModelInstances = response[0];
                    var storeModelInstances = response[0];
                    // logger.debug({
                    //     orgModelId,
                    //     message: `Found product model instances ${productModelInstances.length}`
                    // });
                    logger.debug({
                        orgModelId,
                        message: `Found store model instances ${storeModelInstances.length}`
                    });
                    logger.debug({
                        orgModelId,
                        message: 'Will attach stores and products to sales'
                    });

                    //Initialize the array of unordered batches
                    var batchesArray = [];
                    batchesArray[0] = db.collection('SalesModel').initializeUnorderedBulkOp();
                    var batchCounter = 0, salesLineItemsToUpdate = [];
                    var salesCounter = 0;
                    //Add some operations to be executed
                    _.each(incrementalSales, function (eachSales, iteratee) {
                        var storeModelToAttach = _.findWhere(storeModelInstances, {storeNumber: eachSales.outlet_id});
                        if (storeModelToAttach) {
                            batchesArray[batchCounter].find({
                                orgModelId: ObjectId(orgModelId),
                                api_id: eachSales.id
                            }).upsert().updateOne({
                                $set: {
                                    api_id: eachSales.id,
                                    storeModelId: storeModelToAttach ? ObjectId(storeModelToAttach._id) : null,
                                    outlet_id: eachSales.outlet_id,
                                    transactionNumber: eachSales.invoice_number,
                                    salesDate: eachSales.sale_date,
                                    netAmount: eachSales.total_price,//can't find a discount attribute in vend sales summary, but exists for each line item
                                    grossAmount: eachSales.total_price,
                                    status: eachSales.status,
                                    isReturnSale: eachSales.return_for ? 1 : 0,
                                    orgModelId: ObjectId(orgModelId),
                                    updatedAt: new Date()
                                }
                            });
                            /**
                             * Keep a record of sales line items in different array to update productModelIds and salesModelIds
                             */
                            _.each(eachSales.line_items, function (eachLineItem) {
                                eachLineItem.sales_id = eachSales.id;
                                salesLineItemsToUpdate.push(eachLineItem);
                            });
                        }
                        process.stdout.write('\033[0G');
                        process.stdout.write('Percentage completed: ' + Math.round((iteratee / incrementalSales.length) * 100) + '%');
                        salesCounter++;
                        if (salesCounter === maxBatchSize) {
                            salesCounter = 0;
                            batchCounter++;
                            batchesArray[batchCounter] = db.collection('SalesModel').initializeUnorderedBulkOp();
                            logger.debug({
                                orgModelId,
                                message: `Batch ${batchCounter} of ${maxBatchSize} sales rows ready`
                            });
                        }
                    });
                    var batchSize = (incrementalSales.length - (batchCounter * maxBatchSize));
                    logger.debug({
                        orgModelId,
                        message: `Batch (${batchCounter + 1}) of ${batchSize} sales ready`
                    });
                    //Execute the operations
                    logger.debug({
                        orgModelId,
                        message: `Attached stores to sales, will download the sales in chunks of ${maxBatchSize}`
                    });
                    return executeBatches(batchesArray, 0, orgModelId)
                        .then(function (bulkInsertResponse) {
                            logger.debug({
                                orgModelId,
                                bulkInsertResponse,
                                message: 'Bulk insert operation complete for sales, will download sales line items now'
                            });
                            var productIdsOfSalesLineItems = _.pluck(salesLineItemsToUpdate, 'product_id');
                            var salesIdsOfSalesLineItems = _.pluck(salesLineItemsToUpdate, 'sales_id');
                            return Promise.all([
                                db.collection('ProductModel').find({
                                    "orgModelId": ObjectId(orgModelId),
                                    "api_id": {
                                        $in: productIdsOfSalesLineItems
                                    }
                                }).toArray(),
                                db.collection('SalesModel').find({
                                    "orgModelId": ObjectId(orgModelId),
                                    "api_id": {
                                        $in: salesIdsOfSalesLineItems
                                    }
                                })
                            ]);
                            // return executeBatches(salesLinesBatchesArray, 0, orgModelId);
                        })
                        .then(function (response) {
                            logger.debug({
                                message: 'Found product and sales model corresponding to sales line items, will attach to sales line items',
                                productModelsCount: response[0].length,
                                salesModelsCount: response[1].length,
                                productSample: _.sample(response[0]),
                                salesSample: _.sample(response[1]),
                                orgModelId
                            });
                            var salesLinesBatchesArray = [];
                            salesLinesBatchesArray[0] = db.collection('SalesLineItemsModel').initializeUnorderedBulkOp();
                            var salesLinesBatchCounter = 0, salesLinesCounter = 0;
                            _.each(salesLineItemsToUpdate, function (eachLineItem) {
                                var productModelToAttach = _.findWhere(response[0], function (eachProduct) {
                                    return eachProduct.api_id === eachLineItem.product_id;
                                });
                                var salesModelToAttach = _.findWhere(response[1], function (eachSales) {
                                    return eachSales.api_id === eachLineItem.sales_id;
                                });
                                salesLinesBatchesArray[salesLinesBatchCounter].find({
                                    orgModelId: ObjectId(orgModelId),
                                    api_id: eachLineItem.id
                                }).upsert().updateOne({
                                    $set: {
                                        api_id: eachLineItem.id,
                                        storeModelId: salesModelToAttach ? ObjectId(salesModelToAttach.storeModelId) : null,
                                        productModelId: productModelToAttach ? ObjectId(productModelToAttach._id) : null,
                                        salesModelId: salesModelToAttach ? ObjectId(salesModelToAttach._id) : null,
                                        outlet_id: salesModelToAttach ? salesModelToAttach.outlet_id : null,
                                        product_id: eachLineItem.product_id,
                                        sales_id: eachLineItem.sales_id,
                                        salesDate: salesModelToAttach ? salesModelToAttach.salesDate : null,
                                        quantity: eachLineItem.quantity,
                                        isReturnSale: eachLineItem.is_return ? 1 : 0,
                                        orgModelId: ObjectId(orgModelId),
                                        updatedAt: new Date()
                                    }
                                });
                                salesLinesCounter++;
                                if (salesLinesCounter === maxBatchSize) {
                                    salesLinesCounter = 0;
                                    salesLinesBatchCounter++;
                                    salesLinesBatchesArray[salesLinesBatchCounter] = db.collection('SalesLineItemsModel').initializeUnorderedBulkOp();
                                    logger.debug({
                                        orgModelId,
                                        message: `Batch ${salesLinesBatchCounter} of ${maxBatchSize} sales line item rows ready`
                                    });
                                }
                            });
                            var lastBatchSize = (salesLineItemsToUpdate.length - (salesLinesBatchCounter * maxBatchSize));
                            logger.debug({
                                orgModelId,
                                message: `Batch (${salesLinesBatchCounter + 1}) of ${lastBatchSize} sales ready`
                            });
                            //Execute the operations
                            logger.debug({
                                orgModelId,
                                message: `Attached products, sales summary and store info to sales line items, will download the sales in chunks of ${maxBatchSize}`
                            });
                            return executeBatches(salesLinesBatchesArray, 0, orgModelId);
                        });
                })
                .then(function (bulkInsertResponse) {
                    logger.debug({
                        orgModelId,
                        message: 'Bulk insert operation complete for sales lines',
                        bulkInsertResponse
                    });
                    logger.debug({
                        orgModelId,
                        message: 'Will go on to update version no. in Stockup'
                    });
                    return db.collection('SyncModel').updateOne({
                            $and: [
                                {
                                    'orgModelId': ObjectId(orgModelId)
                                },
                                {
                                    'name': 'sales'
                                }
                            ],
                        },
                        {
                            $set: {
                                'version': dataObject.versionsBefore,
                                // 'syncInProcess': false,
                                'workerTaskId': '',
                                'lastSyncedAt': new Date()
                            }
                        });
                })
                .then(function (res) {
                    logger.debug({
                        orgModelId,
                        message: 'Updated sales version number in Stockup'
                    });
                    return Promise.resolve();
                })
                .catch(function (error) {
                    if (error === 'noIncrementalSales') {
                        // return db.collection('SyncModel').updateOne({
                        //         $and: [
                        //             {
                        //                 'orgModelId': ObjectId(payload.orgModelId)
                        //             },
                        //             {
                        //                 'name': 'inventory'
                        //             }
                        //         ],
                        //     },
                        //     {
                        //         $set: {
                        //             'syncInProcess': false,
                        //             'workerTaskId': '',
                        //             'lastSyncedAt': new Date()
                        //         }
                        //     });
                        logger.error({
                            orgModelId,
                            message: 'No new sales found, will exit worker'
                        });
                        return Promise.resolve();
                    }
                    logger.error({
                        orgModelId,
                        message: 'Could not fetch and save sales',
                        err: error
                    });
                    return Promise.reject(error);
                })
                .finally(function () {
                    logger.debug({
                        orgModelId,
                        message: 'Closing database connection'
                    });
                    if (db) {
                        return db.close();
                    }
                })
                .catch(function (error) {
                    logger.error({
                        orgModelId,
                        message: 'Could not close db connection',
                        err: error
                    });
                    return Promise.resolve();
                    //TODO: set a timeout, after which close all listeners
                });
        }
        catch (e) {
            logger.error({orgModelId, message: '2nd last catch block', err: e});
            throw e;
        }
    }
    catch (e) {
        logger.error({orgModelId, message: 'last catch block', err: e});
        throw e;
    }
};

module.exports = {
    run: runMe
};

/**
 * Execute in chunks of 1,000 because that's the max for
 * initializeUnorderedBulkOp()
 * @param batchesArray
 * @param index
 * @return {Promise.<T>}
 */
function executeBatches(batchesArray, index, orgModelId) {
    return new Promise(function (resolve, reject) {
        logger.debug({orgModelId, message: `Executing batch ${index + 1}`});
        if (batchesArray[index].s && batchesArray[index].s.currentBatch && batchesArray[index].s.currentBatch.operations) {
            batchesArray[index].execute(function (err, result) {
                if (err) {
                    logger.error({orgModelId, message: `ERROR in batch ${index + 1}`, err: err});
                    reject(err);
                }
                else {
                    logger.debug({
                        orgModelId,
                        message: `Successfully executed batch ${index + 1} with ${batchesArray[index].s.currentBatch.operations.length} operations`
                    });
                    resolve('Executed');
                }
            });
        }
        else {
            logger.debug({orgModelId, message: `Skipping empty batch ${index + 1}`});
            resolve('Skipped');
        }
    })
        .then(function (response) {
            if (index<batchesArray.length - 1) {
                return executeBatches(batchesArray, index + 1);
            }
            else {
                return Promise.resolve('Executed');
            }
        })
        .catch(function (error) {
            return Promise.reject(error);
        });
}
