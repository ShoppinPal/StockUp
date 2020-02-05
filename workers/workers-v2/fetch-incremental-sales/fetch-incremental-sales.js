const path = require('path');
const commandName = path.basename(__filename, '.js'); // gives the filename without the .js extension
const logger = require('sp-json-logger')({fileName: 'workers:workers-v2:' + commandName});
var dbUrl = process.env.DB_URL;
var utils = require('./../../jobs/utils/utils.js');
var MongoClient = require('mongodb').MongoClient;
var ObjectId = require('mongodb').ObjectID;
var _ = require('underscore');
var Promise = require('bluebird');
var vendSdk = require('vend-nodejs-sdk')({}); // why the {}?
var salesBatchNumber = 0;

var runMe = function (vendConnectionInfo, orgModelId, versionsAfter) {
    var db = null;
    logger.debug({
        orgModelId,
        message: 'This worker will fetch and save incremental sales from vend to Stockup'
    });
    return MongoClient.connect(dbUrl, {promiseLibrary: Promise})
        .then(function (dbInstance) {
            db = dbInstance;
            logger.debug({
                orgModelId,
                message: 'Connected to mongodb database',
            });
            salesBatchNumber = 0;
            return fetchSalesRecursively(dbInstance, vendConnectionInfo, orgModelId, versionsAfter);
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
};

module.exports = {
    run: runMe
};


function fetchSalesRecursively(dbInstance, vendConnectionInfo, orgModelId, versionsAfter) {
    salesBatchNumber++;
    var argsForSales = vendSdk.args.sales.fetchV2();
    argsForSales.after.value = versionsAfter;
    argsForSales.pageSize.value = 100;
    return vendSdk.sales.fetchV2(argsForSales, vendConnectionInfo)
        .catch(function (error) {
            logger.error({
                message: 'Could not fetch sales from Vend',
                orgModelId,
                salesBatchNumber,
                error,
                functionName: 'fetchSalesRecursively'
            });
            return Promise.reject('Could not fetch sales from Vend');
        })
        .then(function (response) {
            if (response && response.data && response.data.length) {
                logger.debug({
                    message: 'Fetched sales data from vend, will save to DB',
                    salesCount: response.data.length,
                    orgModelId,
                    salesBatchNumber,
                    functionName: 'fetchSalesRecursively'
                });
                return saveSales(dbInstance, vendConnectionInfo, orgModelId, response);
            }
            else if (response && response.data && !response.data.length) {
                logger.debug({
                    message: 'No more sales to fetch, will exit worker',
                    orgModelId,
                    salesBatchNumber,
                    functionName: 'fetchSalesRecursively'
                });
                return Promise.resolve('noIncrementalSales');
            }
            else {
                logger.debug({
                    message: 'Vend API returning null response',
                    response,
                    salesBatchNumber,
                    orgModelId,
                    functionName: 'fetchSalesRecursively'
                });
                return Promise.reject();
            }
        });
}


function saveSales(dbInstance, vendConnectionInfo, orgModelId, sales) {
    var storeIds = _.uniq(_.pluck(sales.data, 'outlet_id'));
    var salesToDelete = _.filter(sales.data, function (eachSale) {
        return eachSale.deleted_at !== undefined && eachSale.deleted_at !== null;
    });
    var salesToSave = _.difference(sales.data, salesToDelete);
    let salesLineItemsToUpdate = [], salesLineItemsToDelete = [], storeModelInstances = [];
    logger.debug({
        orgModelId,
        message: 'Will look for stores and products to attach to sales',
        functionName: 'saveSales',
        salesToSave: salesToSave.length,
        salesToDelete: salesToDelete.length,
        storesCount: storeIds.length,
        storeIds,
        salesBatchNumber
    });
    return dbInstance.collection('StoreModel').find({
        orgModelId: ObjectId(orgModelId),
        storeNumber: {
            $in: storeIds
        }
    }).toArray()
        .then(function (response) {
            storeModelInstances = response;
            logger.debug({
                orgModelId,
                message: 'Found and stores in DB, will attach to sales',
                salesBatchNumber,
                storesCount: storeModelInstances.length,
                functionName: 'saveSales'
            });
            var batch = dbInstance.collection('SalesModel').initializeUnorderedBulkOp();
            _.each(salesToSave, function (eachSales) {
                var storeModelToAttach = _.findWhere(storeModelInstances, {storeNumber: eachSales.outlet_id});
                if (storeModelToAttach) {
                    batch.find({
                        orgModelId: ObjectId(orgModelId),
                        api_id: eachSales.id
                    }).upsert().updateOne({
                        $set: {
                            api_id: eachSales.id,
                            storeModelId: storeModelToAttach ? ObjectId(storeModelToAttach._id) : null,
                            outlet_id: eachSales.outlet_id,
                            transactionNumber: eachSales.invoice_number,
                            salesDate: new Date(eachSales.sale_date),
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
                        eachLineItem.outlet_id = eachSales.outlet_id;
                        salesLineItemsToUpdate.push(eachLineItem);
                    });
                }
            });
            _.each(salesToDelete, function (eachSales) {
                batch.find({
                    orgModelId: ObjectId(orgModelId),
                    api_id: eachSales.id
                }).remove({
                    api_id: eachSales.id
                });
                _.each(eachSales.line_items, function (eachLineItem) {
                    // eachLineItem.sales_id = eachSales.id;
                    salesLineItemsToDelete.push(eachLineItem);
                });
            });
            logger.debug({
                orgModelId,
                message: 'Attached stores to sales, will download them into database',
                salesBatchNumber,
                functionName: 'saveSales'
            });
            return executeBatch(batch, orgModelId);
        })
        .catch(function (error) {
            logger.error({
                message: 'Could not execute batch operation, will exit',
                error,
                salesBatchNumber,
                functionName: 'saveSales',
                orgModelId
            });
            return Promise.reject();
        })
        .then(function () {
            logger.debug({
                orgModelId,
                message: 'Successfully executed batch of Sales, will save sales line items now',
                salesBatchNumber,
                functionName: 'saveSales'
            });
            let productIdsOfSalesLineItems = _.pluck(salesLineItemsToUpdate, 'product_id');
            let salesIdsOfSalesLineItems = _.pluck(salesLineItemsToUpdate, 'sales_id');
            return Promise.all([
                dbInstance.collection('ProductModel').find({
                    "orgModelId": ObjectId(orgModelId),
                    "api_id": {
                        $in: productIdsOfSalesLineItems
                    }
                }).toArray(),
                dbInstance.collection('SalesModel').find({
                    "orgModelId": ObjectId(orgModelId),
                    "api_id": {
                        $in: salesIdsOfSalesLineItems
                    }
                }).toArray()
            ]);
        })
        .catch(function (error) {
            logger.error({
                message: 'Could not fetch products and sales from DB',
                error,
                orgModelId,
                functionName: 'saveSales'
            });
            return Promise.reject('Could not fetch products and sales from DB');
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
            let batch = dbInstance.collection('SalesLineItemsModel').initializeUnorderedBulkOp();
            _.each(salesLineItemsToUpdate, function (eachLineItem) {
                var productModelToAttach = _.findWhere(response[0], {api_id: eachLineItem.product_id});
                var salesModelToAttach = _.findWhere(response[1],{api_id: eachLineItem.sales_id});
                var storeModelToAttach = _.findWhere(storeModelInstances, {storeNumber: eachLineItem.outlet_id});
                batch.find({
                    orgModelId: ObjectId(orgModelId),
                    api_id: eachLineItem.id
                }).upsert().updateOne({
                    $set: {
                        api_id: eachLineItem.id,
                        storeModelId: salesModelToAttach ? ObjectId(salesModelToAttach.storeModelId) : null,
                        productModelId: productModelToAttach ? ObjectId(productModelToAttach._id) : null,
                        salesModelId: salesModelToAttach ? ObjectId(salesModelToAttach._id) : null,
                        outlet_id: storeModelToAttach ? storeModelToAttach.outlet_id : null,
                        product_id: eachLineItem.product_id,
                        sales_id: eachLineItem.sales_id,
                        salesDate: salesModelToAttach ? salesModelToAttach.salesDate : null,
                        quantity: eachLineItem.quantity,
                        isReturnSale: eachLineItem.is_return ? 1 : 0,
                        orgModelId: ObjectId(orgModelId),
                        updatedAt: new Date()
                    }
                });
            });
            _.each(salesLineItemsToDelete, function (eachLineItem) {
                batch.find({
                    orgModelId: ObjectId(orgModelId),
                    api_id: eachLineItem.id
                }).remove({
                    api_id: eachLineItem.id
                });
                _.each(eachSales.line_items, function (eachLineItem) {
                    eachLineItem.sales_id = eachSales.id;
                    salesLineItemsToDelete.push(eachLineItem);
                });
            });
            logger.debug({
                orgModelId,
                message: `Attached products, sales summary and store info to sales line items, will download the sales line items`,
                functionName: 'saveSales'
            });
            return executeBatch(batch, orgModelId);
        })
        .catch(function (error) {
            logger.error({
                message: 'Could not execute batch operation, will exit',
                error,
                salesBatchNumber,
                functionName: 'saveSales',
                orgModelId
            });
            return Promise.reject();
        })
        .then(function () {
            logger.debug({
                orgModelId,
                message: 'Successfully executed batch of Sales, will update version number in DB',
                salesBatchNumber,
                functionName: 'saveSales'
            });
            return dbInstance.collection('SyncModel').updateOne({
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
                        'version': sales.version.max
                    }
                });
        })
        .catch(function (error) {
            logger.error({
                message: 'Could not update version number in DB, will stop sync',
                error,
                orgModelId,
                salesBatchNumber,
                functionName: 'saveSales'
            });
            return Promise.reject('Could not update version number in DB, will stop sync');
        })
        .then(function () {
            return fetchSalesRecursively(dbInstance, vendConnectionInfo, orgModelId, sales.version.max);
        });
}


function executeBatch(batch, orgModelId) {
    return new Promise(function (resolve, reject) {
        logger.debug({
            orgModelId,
            message: `Executing batch of sales`,
            salesBatchNumber,
            functionName: 'executeBatch'
        });
        if (batch.s && batch.s.currentBatch && batch.s.currentBatch.operations) {
            batch.execute(function (err, result) {
                if (err) {
                    logger.error({
                        orgModelId,
                        message: `ERROR in batch`,
                        salesBatchNumber,
                        err: err,
                        functionName: 'executeBatch'
                    });
                    reject(err);
                }
                else {
                    logger.debug({
                        orgModelId,
                        message: `Successfully executed batch operation`,
                        salesBatchNumber,
                        "nInserted": result.nInserted,
                        "nUpserted": result.nUpserted,
                        "nMatched": result.nMatched,
                        "nModified": result.nModified,
                        "nRemoved": result.nRemoved,
                        functionName: 'executeBatch'
                    });
                    resolve('Executed');
                }
            });
        }
        else {
            logger.debug({
                orgModelId,
                salesBatchNumber,
                message: `Skipping empty batch`,
                functionName: 'executeBatch'
            });
            resolve('Skipped');
        }
    });
}
