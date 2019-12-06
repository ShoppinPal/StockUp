const path = require('path');
const commandName = path.basename(__filename, '.js'); // gives the filename without the .js extension
const logger = require('sp-json-logger')({fileName: 'workers:workers-v2:' + commandName});

var runMe = function (payload, config, taskId, messageId) {

    var dbUrl = process.env.DB_URL;
    var orgModelId = payload.orgModelId;

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
        var invalidInventoryCounter = 0, inventoryNotFoundCounter = 0;
        try {
            // process.env['User-Agent'] = taskId + ':' + messageId + ':' + commandName + ':' + payload.domainPrefix;
            logger.debug({
                orgModelId,
                message: 'This worker will validate StockUp inventory by comparing it to Vend inventory',
                messageId
            });
            // return utils.savePayloadConfigToFiles(payload)
            return Promise.resolve()
                .then(function () {
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
                        message: 'Connected to Mongo DB, will fetch Vend Token',
                        commandName,
                        messageId
                    });
                    return utils.fetchVendToken(db, orgModelId, messageId);
                })
                .then(function (token) {
                    logger.debug({
                        message: 'Fetched vend token, will fetch connection info',
                        messageId
                    });
                    return utils.getVendConnectionInfo(db, orgModelId, messageId);
                })
                .then(function (vendConnectionInfo) {
                    var argsForInventory = vendSdk.args.inventory.fetchAll();
                    argsForInventory.after.value = 0;
                    argsForInventory.pageSize.value = maxBatchSize;
                    return vendSdk.inventory.fetchAll(argsForInventory, vendConnectionInfo);
                })
                .then(function (fetchedInventory) {
                    logger.debug({
                        orgModelId,
                        messageId,
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
                        message: 'Connected to mongodb database',
                        messageId
                    });
                    db = dbInstance;
                    var inventoryApiIdsInChunks = _.chunk(_.pluck(incrementalInventory, 'id'), maxBatchSize);
                    return Promise.map(inventoryApiIdsInChunks, function (eachChunkOfApiIds, batchIndex) {
                        return db.collection('InventoryModel').find({
                            orgModelId: ObjectId(orgModelId),
                            api_id: {
                                $in: eachChunkOfApiIds
                            }
                        }).toArray()
                            .then(function (inventoryModelInstances) {
                                logger.debug({
                                    message: 'Found inventory model instances for 1000 vend inventories',
                                    batchIndex,
                                    count: inventoryModelInstances.length,
                                    orgModelId,
                                    messageId
                                });
                                _.each(eachChunkOfApiIds, function (eachInventoryApiId) {
                                    var inventoryFound = _.findWhere(inventoryModelInstances, {api_id: eachInventoryApiId});
                                    var vendInventory = _.findWhere(incrementalInventory, {id: eachInventoryApiId});
                                    if (inventoryFound) {
                                        if (inventoryFound.inventory_level !== vendInventory.inventory_level) {
                                            logger.debug({
                                                message: 'Invalid inventory count found',
                                                inventoryFound,
                                                vendInventory,
                                                orgModelId,
                                                messageId
                                            });
                                            invalidInventoryCounter++;
                                        }
                                    }
                                    else {
                                        logger.debug({
                                            message: 'Could not find this inventory',
                                            vendInventory,
                                            orgModelId,
                                            messageId
                                        });
                                        inventoryNotFoundCounter++;
                                    }
                                });
                                return Promise.resolve();
                            })
                    }, {
                        concurrency: 1
                    });
                })
                .then(function () {

                    logger.debug({
                        message: 'Total invalid inventory and inventory not found counts',
                        invalidInventoryCounter,
                        inventoryNotFoundCounter,
                        orgModelId,
                        messageId
                    });
                    var slackMessage = 'Vend inventory check found: ' +
                        '\n Invalid Inventory Data' + ': ' + invalidInventoryCounter +
                        '\n Inventory Data not found: ' + inventoryNotFoundCounter +
                        '\n orgModelId: ' + orgModelId +
                        '\n Environment: ' + process.env.NODE_ENV +
                        '\n MessageId: ' + messageId;
                    utils.sendSlackMessage('Check Vend Inventory Worker', slackMessage, true);
                    return Promise.resolve();
                })
                .finally(function () {
                    logger.debug({
                        orgModelId,
                        message: 'Closing database connection',
                        messageId
                    });
                    if (db) {
                        return db.close();
                    }
                })
                .catch(function (error) {
                    logger.error({
                        orgModelId,
                        message: 'Could not close db connection',
                        err: error,
                        messageId
                    });
                    return Promise.resolve();
                    //TODO: set a timeout, after which close all listeners
                });
        }
        catch (e) {
            logger.error({orgModelId, messageId, message: '2nd last catch block', err: e});
            throw e;
        }
    }
    catch (e) {
        logger.error({orgModelId, messageId, message: 'last catch block', err: e});
        throw e;
    }
};

module.exports = {
    run: runMe
};
