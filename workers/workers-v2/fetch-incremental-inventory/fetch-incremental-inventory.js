const path = require('path');
const commandName = path.basename(__filename, '.js'); // gives the filename without the .js extension
const logger = require('sp-json-logger')({fileName: 'workers:workers-v2:' + commandName});
var vendSdk = require('vend-nodejs-sdk')({}); //kamal: why the {}?
var utils = require('./../../jobs/utils/utils.js');
var MongoClient = require('mongodb').MongoClient;
var ObjectId = require('mongodb').ObjectID;
var _ = require('underscore');
var Promise = require('bluebird');
var db = null; //database connected
var maxBatchSize = 1000;
var dbUrl = process.env.DB_URL;

var runMe = function (vendConnectionInfo, orgModelId, versionsAfter) {


    try {

        try {
            // process.env['User-Agent'] = taskId + ':' + messageId + ':' + commandName + ':' + payload.domainPrefix;
            logger.debug({
                orgModelId,
                message: 'This worker will fetch and save incremental inventory from vend to warehouse'
            });
            return Promise.resolve()
                .then(function () {
                    return fetchInventoryRecursively(vendConnectionInfo, orgModelId, versionsAfter);
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

function fetchInventoryRecursively(vendConnectionInfo, orgModelId, versionsAfter) {
    var argsForInventory = vendSdk.args.inventory.fetch();
    argsForInventory.after.value = versionsAfter;
    argsForInventory.pageSize.value = maxBatchSize;
    return vendSdk.inventory.fetch(argsForInventory, vendConnectionInfo)
        .catch(function (error) {
            logger.error({
                message: 'Could not fetch inventory from Vend',
                orgModelId,
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
                    functionName: 'fetchInventoryRecursively'
                });
                return saveInventory(vendConnectionInfo, orgModelId, response);
            }
            else if (response && response.data && !response.data.length) {
                logger.debug({
                    message: 'No more inventory to fetch, will exit worker',
                    orgModelId,
                    functionName: 'fetchInventoryRecursively'
                });
                return Promise.resolve('noIncrementalInventory');
            }
            else {
                logger.debug({
                    message: 'Vend API returning null',
                    response,
                    orgModelId,
                    functionName: 'fetchInventoryRecursively'
                });
                return Promise.reject();
            }
        });
}

function saveInventory(vendConnectionInfo, orgModelId, inventory) {
    return MongoClient.connect(dbUrl, {promiseLibrary: Promise})
        .then(function (dbInstance) {
            logger.debug({
                orgModelId,
                message: 'Connected to mongodb database',
                functionName: 'saveInventory'
            });
            var productIds = _.pluck(inventory.data, 'product_id');
            var outletIds = _.pluck(inventory.data, 'outlet_id');
            db = dbInstance;
            return Promise.all([
                db.collection('ProductModel').find({
                    "orgModelId": ObjectId(orgModelId),
                    "api_id": {
                        $in: productIds
                    }
                }).toArray(),
                db.collection('StoreModel').find({
                    "orgModelId": ObjectId(orgModelId),
                    "storeNumber": {
                        $in: outletIds
                    }
                }).toArray()
            ]);
        })
        .then(function (response) {
            var productModelInstances = response[0];
            var storeModelInstances = response[1];
            logger.debug({
                orgModelId,
                message: 'Found product and stores in DB, will attach to inventory data',
                productCount: productModelInstances.length,
                storesCount: storeModelInstances.length,
                functionName: 'saveInventory'
            });
            var batch = db.collection('InventoryModel').initializeUnorderedBulkOp();
            var invalidInventoryCounter = 0;
            _.each(inventory.data, function (eachInventory) {
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
                            product_id: eachInventory.product_id,
                            outlet_id: eachInventory.outlet_id,
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
                        message: 'Could not find a store or product for this inventory',
                        eachInventory,
                        orgModelId,
                        functionName: 'saveInventory'
                    });
                    invalidInventoryCounter++;
                }
            });
            logger.debug({
                message: 'Total invalid inventory count',
                invalidInventoryCounter,
                orgModelId,
                functionName: 'saveInventory'
            });
            logger.debug({
                orgModelId,
                message: 'Attached stores and products, will save inventory to DB',
                functionName: 'saveInventory'
            });
            return executeBatch(batch, orgModelId);
        })
        .catch(function (error) {
            logger.error({
                message: 'Could not execute batch operation, will exit',
                error,
                functionName: 'saveInventory',
                orgModelId
            });
            return Promise.reject();
        })
        .then(function () {
            logger.debug({
                message: 'Successfully executed batch of Inventory, will update version number in DB',
                orgModelId,
                functionName: 'saveInventory'
            });
            return db.collection('SyncModel').updateOne({
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
                        'version': inventory.version.max,
                        'lastSyncedAt': new Date()
                    }
                });
        })
        .catch(function (error) {
            logger.error({
                message: 'Could not update version number in DB, will stop sync',
                error,
                orgModelId,
                functionName: 'saveInventory'
            });
            return Promise.reject('Could not update version number in DB, will stop sync');
        })
        .then(function () {
            return fetchInventoryRecursively(vendConnectionInfo, orgModelId, inventory.version.max);
        });
}

function executeBatch(batch, orgModelId) {
    return new Promise(function (resolve, reject) {
        logger.debug({
            orgModelId,
            message: `Executing batch of inventory`,
            functionName: 'executeBatch'
        });
        if (batch.s && batch.s.currentBatch && batch.s.currentBatch.operations) {
            batch.execute(function (err, result) {
                if (err) {
                    logger.error({
                        orgModelId,
                        message: `ERROR in batch`,
                        err: err,
                        functionName: 'executeBatch'
                    });
                    reject(err);
                }
                else {
                    logger.debug({
                        orgModelId,
                        message: `Successfully executed batch operation`,
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
                message: `Skipping empty batch`,
                functionName: 'executeBatch'
            });
            resolve('Skipped');
        }
    });
}
