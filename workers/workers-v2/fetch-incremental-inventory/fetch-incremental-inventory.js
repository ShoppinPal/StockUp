const path = require('path');
const commandName = path.basename(__filename, '.js'); // gives the filename without the .js extension
const logger = require('sp-json-logger')({fileName: 'workers:workers-v2:' + commandName});
var vendSdk = require('vend-nodejs-sdk')({}); //kamal: why the {}?
var utils = require('./../../jobs/utils/utils.js');
var MongoClient = require('mongodb').MongoClient;
var ObjectId = require('mongodb').ObjectID;
var _ = require('underscore');
var Promise = require('bluebird');
var maxBatchSize = 1000;
var dbUrl = process.env.DB_URL;
var inventoryBatchNumber;

var runMe = function (vendConnectionInfo, orgModelId, versionsAfter) {

    var db = null;
    logger.debug({
        orgModelId,
        message: 'This worker will fetch and save incremental inventory from vend to warehouse'
    });
    return MongoClient.connect(dbUrl, {promiseLibrary: Promise})
        .then(function (dbInstance) {
            db = dbInstance;
            logger.debug({
                orgModelId,
                message: 'Connected to mongodb database',
            });
            inventoryBatchNumber = 0;
            return fetchInventoryRecursively(dbInstance, vendConnectionInfo, orgModelId, versionsAfter);
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

function fetchInventoryRecursively(dbInstance, vendConnectionInfo, orgModelId, versionsAfter) {
    inventoryBatchNumber++;
    var argsForInventory = vendSdk.args.inventory.fetch();
    argsForInventory.after.value = versionsAfter;
    argsForInventory.pageSize.value = maxBatchSize;
    return vendSdk.inventory.fetch(argsForInventory, vendConnectionInfo)
        .catch(function (error) {
            logger.error({
                message: 'Could not fetch inventory from Vend',
                orgModelId,
                inventoryBatchNumber,
                error,
                functionName: 'fetchInventoryRecursively'
            });
            return Promise.reject('Could not fetch inventory from Vend');
        })
        .then(function (response) {
            if (response && response.data && response.data.length) {
                logger.debug({
                    message: 'Fetched inventory data from vend, will save to DB',
                    inventoryCount: response.data.length,
                    orgModelId,
                    inventoryBatchNumber,
                    functionName: 'fetchInventoryRecursively'
                });
                return saveInventory(dbInstance, vendConnectionInfo, orgModelId, response);
            }
            else if (response && response.data && !response.data.length) {
                logger.debug({
                    message: 'No more inventory to fetch, will exit worker',
                    orgModelId,
                    inventoryBatchNumber,
                    functionName: 'fetchInventoryRecursively'
                });
                return Promise.resolve('noIncrementalInventory');
            }
            else {
                logger.debug({
                    message: 'Vend API returning null response',
                    response,
                    inventoryBatchNumber,
                    orgModelId,
                    functionName: 'fetchInventoryRecursively'
                });
                return Promise.reject();
            }
        });
}

function saveInventory(dbInstance, vendConnectionInfo, orgModelId, inventory) {
    var productIds = _.uniq(_.pluck(inventory.data, 'product_id'));
    var outletIds = _.uniq(_.pluck(inventory.data, 'outlet_id'));
    var inventoryToDelete = _.filter(inventory.data, function (eachInventory) {
        return eachInventory.deleted_at !== undefined && eachInventory.deleted_at !== null;
    });
    var inventoryToSave = _.difference(inventory.data, inventoryToDelete);
    logger.debug({
        message: 'Will look for products and stores to attach to inventory',
        orgModelId,
        functionName: 'saveInventory',
        inventoryToDelete: inventoryToDelete.length,
        inventoryToSave: inventoryToSave.length,
        inventoryBatchNumber
    });
    return Promise.all([
        dbInstance.collection('ProductModel').find({
            "orgModelId": ObjectId(orgModelId),
            "api_id": {
                $in: productIds
            }
        }).toArray(),
        dbInstance.collection('StoreModel').find({
            "orgModelId": ObjectId(orgModelId),
            "storeNumber": {
                $in: outletIds
            }
        }).toArray()
    ])
        .then(function (response) {
            var productModelInstances = response[0];
            var storeModelInstances = response[1];
            logger.debug({
                orgModelId,
                message: 'Found product and stores in DB, will attach to inventory data',
                inventoryBatchNumber,
                productCount: productModelInstances.length,
                storesCount: storeModelInstances.length,
                functionName: 'saveInventory'
            });
            var batch = dbInstance.collection('InventoryModel').initializeUnorderedBulkOp();
            var invalidInventoryCounter = 0;
            _.each(inventoryToSave, function (eachInventory) {
                var productModelToAttach = _.findWhere(productModelInstances, {api_id: eachInventory.product_id});
                var storeModelToAttach = _.findWhere(storeModelInstances, {storeNumber: eachInventory.outlet_id});
                if (productModelToAttach && storeModelToAttach) {
                    batch.find({
                        orgModelId: ObjectId(orgModelId),
                        api_id: eachInventory.id
                    }).upsert().updateOne({
                        $set: {
                            api_id: eachInventory.id,
                            productModelId: productModelToAttach ? productModelToAttach._id : null,
                            storeModelId: storeModelToAttach ? storeModelToAttach._id : null,
                            productModelVendId: eachInventory.product_id,
                            storeModelVendId: eachInventory.outlet_id,
                            inventory_level: eachInventory.inventory_level,
                            reorder_point: eachInventory.reorder_point,
                            reorder_amount: eachInventory.reorder_amount,
                            orgModelId: ObjectId(orgModelId),
                            updatedAt: new Date()
                        }
                    });
                }
                else {
                    logger.debug({
                        inventoryBatchNumber,
                        message: 'Could not find a store or product for this inventory',
                        eachInventory,
                        orgModelId,
                        functionName: 'saveInventory'
                    });
                    invalidInventoryCounter++;
                }
            });
            _.each(inventoryToDelete, function (eachInventory) {
                batch.find({
                    orgModelId: ObjectId(orgModelId),
                    api_id: eachInventory.id
                }).remove({
                    api_id: eachInventory.id
                })
            });
            logger.debug({
                message: 'Total invalid inventory count',
                invalidInventoryCounter,
                inventoryBatchNumber,
                orgModelId,
                functionName: 'saveInventory'
            });
            logger.debug({
                orgModelId,
                message: 'Attached stores and products, will save inventory to DB',
                inventoryBatchNumber,
                functionName: 'saveInventory'
            });
            return executeBatch(batch, orgModelId);
        })
        .catch(function (error) {
            logger.error({
                message: 'Could not execute batch operation, will exit',
                error,
                inventoryBatchNumber,
                functionName: 'saveInventory',
                orgModelId
            });
            return Promise.reject();
        })
        .then(function () {
            logger.debug({
                message: 'Successfully executed batch of Inventory, will update version number in DB',
                orgModelId,
                inventoryBatchNumber,
                functionName: 'saveInventory'
            });
            return dbInstance.collection('SyncModel').updateOne({
                    $and: [
                        {
                            'orgModelId': ObjectId(orgModelId)
                        },
                        {
                            'name': 'inventory'
                        }
                    ],
                },
                {
                    $set: {
                        'version': inventory.version.max
                    }
                });
        })
        .catch(function (error) {
            logger.error({
                message: 'Could not update version number in DB, will stop sync',
                error,
                orgModelId,
                inventoryBatchNumber,
                functionName: 'saveInventory'
            });
            return Promise.reject('Could not update version number in DB, will stop sync');
        })
        .then(function () {
            return fetchInventoryRecursively(dbInstance, vendConnectionInfo, orgModelId, inventory.version.max);
        });
}

function executeBatch(batch, orgModelId) {
    return new Promise(function (resolve, reject) {
        logger.debug({
            orgModelId,
            message: `Executing batch of inventory`,
            inventoryBatchNumber,
            functionName: 'executeBatch'
        });
        if (batch.s && batch.s.currentBatch && batch.s.currentBatch.operations) {
            batch.execute(function (err, result) {
                if (err) {
                    logger.error({
                        orgModelId,
                        message: `ERROR in batch`,
                        inventoryBatchNumber,
                        err: err,
                        functionName: 'executeBatch'
                    });
                    reject(err);
                }
                else {
                    logger.debug({
                        orgModelId,
                        message: `Successfully executed batch operation`,
                        inventoryBatchNumber,
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
                inventoryBatchNumber,
                message: `Skipping empty batch`,
                functionName: 'executeBatch'
            });
            resolve('Skipped');
        }
    });
}
