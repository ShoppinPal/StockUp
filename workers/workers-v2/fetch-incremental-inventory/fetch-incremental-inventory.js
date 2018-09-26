const logger = require('sp-json-logger')();

var runMe = function (payload, config, taskId, messageId) {

    var dbUrl = process.env.DB_URL;

    try {
        var utils = require('./../../jobs/utils/utils.js');
        var path = require('path');
        var MongoClient = require('mongodb').MongoClient;
        var ObjectId = require('mongodb').ObjectID;
        var _ = require('underscore');
        var Promise = require('bluebird');
        var vendSdk = require('vend-nodejs-sdk')({}); //kamal: why the {}?
        var vendConnectionInfo;
        var db = null; //database connected
        var incrementalInventory;
        var maxBatchSize = 1000;

        // Global variable for logging
        var commandName = path.basename(__filename, '.js'); // gives the filename without the .js extension

        logger.debug({
            messageId: messageId,
            commandName: commandName,
            payload: payload,
            config: config,
            taskId: taskId,
            argv: process.argv,
            env: process.env
        });

        try {
            process.env['User-Agent'] = taskId + ':' + messageId + ':' + commandName + ':' + payload.domainPrefix;
            logger.debug({
                messageId: messageId,
                commandName: commandName,
                message: 'This worker will fetch and save incremental suppliers from vend to warehouse'
            });
            return utils.savePayloadConfigToFiles(payload)
                .then(function () {
                    //TODO: remove these relative paths
                    var nconf = require('./../../node_modules/nconf/lib/nconf');
                    nconf.file('client', {file: 'config/client.json'})
                    //.file('settings', { file: 'config/settings.json' }) // NOTE: useful for quicker testing
                        .file('oauth', {file: 'config/oauth.json'});
                    logger.debug({messageId: messageId, commandName: commandName, nconf: nconf.get()});
                    vendConnectionInfo = utils.loadOauthTokens();
                    var argsForInventory = vendSdk.args.inventory.fetchAll();
                    argsForInventory.after.value = payload.versionsAfter;
                    argsForInventory.pageSize.value = 1000;
                    return vendSdk.inventory.fetchAll(argsForInventory, vendConnectionInfo);
                })
                .then(function (fetchedInventory) {
                    logger.debug({
                        messageId: messageId,
                        commandName: commandName,
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
                        messageId: messageId,
                        commandName: commandName,
                        message: 'Connected to mongodb database'
                    });
                    db = dbInstance;
                    return Promise.all([
                        db.collection('ProductModel').find({
                            "orgModelId": ObjectId(payload.orgModelId)
                        }).toArray(),
                        db.collection('StoreModel').find({
                            "orgModelId": ObjectId(payload.orgModelId)
                        }).toArray()
                    ]);
                })
                .then(function (response) {
                    var productModelInstances = response[0];
                    var storeModelInstances = response[1];
                    logger.debug({
                        messageId: messageId,
                        commandName: commandName,
                        message: `Found product model instances ${productModelInstances.length}`
                    });
                    logger.debug({
                        messageId: messageId,
                        commandName: commandName,
                        message: `Found store model instances ${storeModelInstances.length}`
                    });
                    logger.debug({
                        messageId: messageId,
                        commandName: commandName,
                        message: 'Will attach stores and products to inventory'
                    });

                    //Initialize the array of unordered batches
                    var batchesArray = [];
                    batchesArray[0] = db.collection('InventoryModel').initializeUnorderedBulkOp();
                    var batchCounter = 0, inventoryCounter = 0;
                    //Add some operations to be executed
                    _.each(incrementalInventory, function (eachInventory, iteratee) {
                        if (eachInventory.reorder_point !== null) {
                            var productModelToAttach = _.findWhere(productModelInstances, {api_id: eachInventory.product_id});
                            var storeModelToAttach = _.findWhere(storeModelInstances, {api_id: eachInventory.outlet_id});
                            batchesArray[batchCounter].find({
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
                                    orgModelId: ObjectId(payload.orgModelId)
                                }
                            });
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
                                messageId: messageId,
                                commandName: commandName,
                                message: `Batch ${batchCounter} of ${maxBatchSize} inventory ready`
                            });
                        }
                    });
                    var batchSize = (incrementalInventory.length - (batchCounter * maxBatchSize));
                    logger.debug({
                        messageId: messageId,
                        commandName: commandName,
                        message: `Batch (${batchCounter + 1}) of ${batchSize} inventory ready`
                    });
                    //Execute the operations
                    logger.debug({
                        messageId: messageId,
                        commandName: commandName,
                        message: `Attached stores and products, will download the inventory in chunks of ${maxBatchSize}`
                    });
                    return executeBatches(batchesArray, 0);
                })
                .then(function (bulkInsertResponse) {
                    logger.debug({
                        messageId: messageId,
                        commandName: commandName,
                        message: 'Bulk insert operation complete'
                    });
                    logger.debug({
                        messageId: messageId,
                        commandName: commandName,
                        message: 'Will go on to update version no. in warehouse'
                    });
                    return db.collection('SyncModel').updateOne({
                            $and: [
                                {
                                    'orgModelId': ObjectId(payload.orgModelId)
                                },
                                {
                                    'name': 'inventory'
                                }
                            ],
                        },
                        {
                            $set: {
                                'version': payload.versionsBefore,
                                'syncInProcess': false,
                                'workerTaskId': '',
                                'lastSyncedAt': new Date()
                            }
                        });
                })
                .then(function (res) {
                    logger.debug({
                        messageId: messageId,
                        commandName: commandName,
                        message: 'Updated inventory version number in warehouse'
                    });
                    return Promise.resolve();
                })
                .catch(function (error) {
                    if (error === 'noIncrementalInventory') {
                        return db.collection('SyncModel').updateOne({
                                $and: [
                                    {
                                        'orgModelId': ObjectId(payload.orgModelId)
                                    },
                                    {
                                        'name': 'inventory'
                                    }
                                ],
                            },
                            {
                                $set: {
                                    'syncInProcess': false,
                                    'workerTaskId': '',
                                    'lastSyncedAt': new Date()
                                }
                            });
                    }
                    logger.error({
                        messageId: messageId,
                        commandName: commandName,
                        message: 'Could not fetch and save products',
                        err: error
                    });
                    return Promise.reject(error);
                })
                .finally(function () {
                    logger.debug({
                        messageId: messageId,
                        commandName: commandName,
                        message: 'Closing database connection'
                    });
                    if (db) {
                        return db.close();
                    }
                })
                .catch(function (error) {
                    logger.error({
                        messageId: messageId,
                        commandName: commandName,
                        message: 'Could not close db connection',
                        err: error
                    });
                    return Promise.resolve();
                    //TODO: set a timeout, after which close all listeners
                });
        }
        catch (e) {
            logger.error({messageId: messageId, commandName: commandName, message: '2nd last catch block', err: e});
            throw e;
        }
    }
    catch (e) {
        logger.error({messageId: messageId, message: 'last catch block', err: e});
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
function executeBatches(batchesArray, index) {
    return new Promise(function (resolve, reject) {
        logger.debug({message: `Executing batch ${index + 1}`});
        if (batchesArray[index].s && batchesArray[index].s.currentBatch && batchesArray[index].s.currentBatch.operations) {
            batchesArray[index].execute(function (err, result) {
                if (err) {
                    logger.error({message: `ERROR in batch ${index + 1}`, err: err});
                    reject(err);
                }
                else {
                    logger.debug({message: `Successfully executed batch ${index + 1} with ${batchesArray[index].s.currentBatch.operations.length} operations`});
                    resolve('Executed');
                }
            });
        }
        else {
            logger.debug({message: `Skipping empty batch ${index + 1}`});
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
