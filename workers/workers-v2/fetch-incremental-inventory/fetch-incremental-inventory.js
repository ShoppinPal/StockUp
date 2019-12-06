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
        var incrementalInventory;
        var maxBatchSize = 1000;

        try {
            // process.env['User-Agent'] = taskId + ':' + messageId + ':' + commandName + ':' + payload.domainPrefix;
            logger.debug({
                orgModelId,
                message: 'This worker will fetch and save incremental inventory from vend to warehouse'
            });
            // return utils.savePayloadConfigToFiles(payload)
            return Promise.resolve()
                .then(function () {
                    /**
                     //TODO: remove these relative paths
                     var nconf = require('./../../node_modules/nconf/lib/nconf');
                     nconf.file('client', {file: 'config/client.json'})
                     //.file('settings', { file: 'config/settings.json' }) // NOTE: useful for quicker testing
                     .file('oauth', {file: 'config/oauth.json'});
                     logger.debug({orgModelId,messageId: messageId, commandName: commandName, nconf: nconf.get()});
                     vendConnectionInfo = utils.loadOauthTokens();
                     */
                    var argsForInventory = vendSdk.args.inventory.fetchAll();
                    argsForInventory.after.value = dataObject.versionsAfter;
                    argsForInventory.pageSize.value = 1000;
                    return vendSdk.inventory.fetchAll(argsForInventory, vendConnectionInfo);
                })
                .then(function (fetchedInventory) {
                    logger.debug({
                        orgModelId,
                        message: `Found ${fetchedInventory.length} new inventory, will filter only required data from them`
                    });
                    incrementalInventory = fetchedInventory;
                    if (!incrementalInventory.length) {
                        return Promise.reject('noIncrementalInventory');
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
                        db.collection('ProductModel').find({
                            "orgModelId": ObjectId(orgModelId)
                        }).toArray(),
                        db.collection('StoreModel').find({
                            "orgModelId": ObjectId(orgModelId)
                        }).toArray()
                    ]);
                })
                .then(function (response) {
                    var productModelInstances = response[0];
                    var storeModelInstances = response[1];
                    logger.debug({
                        orgModelId,
                        message: `Found product model instances ${productModelInstances.length}`
                    });
                    logger.debug({
                        orgModelId,
                        message: `Found store model instances ${storeModelInstances.length}`
                    });
                    logger.debug({
                        orgModelId,
                        message: 'Will attach stores and products to inventory'
                    });

                    //Initialize the array of unordered batches
                    var batchesArray = [];
                    batchesArray[0] = db.collection('InventoryModel').initializeUnorderedBulkOp();
                    var batchCounter = 0, inventoryCounter = 0, invalidInventoryCounter = 0;
                    //Add some operations to be executed
                    _.each(incrementalInventory, function (eachInventory, iteratee) {
                        var productModelToAttach = _.findWhere(productModelInstances, {api_id: eachInventory.product_id});
                        var storeModelToAttach = _.findWhere(storeModelInstances, {storeNumber: eachInventory.outlet_id});
                        if(productModelToAttach && storeModelToAttach) {
                            batchesArray[batchCounter].find({
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
                                orgModelId
                            });
                            invalidInventoryCounter++;
                        }
                        process.stdout.write('\033[0G');
                        process.stdout.write('Percentage completed: ' + Math.round((iteratee / incrementalInventory.length) * 100) + '%');
                        iteratee++;
                        inventoryCounter++;
                        if (inventoryCounter === maxBatchSize) {
                            inventoryCounter = 0;
                            batchCounter++;
                            batchesArray[batchCounter] = db.collection('InventoryModel').initializeUnorderedBulkOp();
                            logger.debug({
                                orgModelId,
                                message: `Batch ${batchCounter} of ${maxBatchSize} inventory ready`
                            });
                        }
                    });
                    logger.debug({
                        message: 'Total invalid inventory count',
                        invalidInventoryCounter,
                        orgModelId
                    });
                    var batchSize = (incrementalInventory.length - (batchCounter * maxBatchSize));
                    logger.debug({
                        orgModelId,
                        message: `Batch (${batchCounter + 1}) of ${batchSize} inventory ready`
                    });
                    //Execute the operations
                    logger.debug({
                        orgModelId,
                        message: `Attached stores and products, will download the inventory in chunks of ${maxBatchSize}`
                    });
                    return executeBatches(batchesArray, 0, orgModelId);
                })
                .then(function (bulkInsertResponse) {
                    logger.debug({
                        orgModelId,
                        message: 'Bulk insert operation complete'
                    });
                    logger.debug({
                        orgModelId,
                        message: 'Will go on to update version no. in warehouse'
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
                        message: 'Updated inventory version number in warehouse'
                    });
                    return Promise.resolve();
                })
                .catch(function (error) {
                    if (error === 'noIncrementalInventory') {
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
                            message: 'No new inventory found, will exit worker'
                        });
                        return Promise.resolve();
                    }
                    logger.error({
                        orgModelId,
                        message: 'Could not fetch and save products',
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
