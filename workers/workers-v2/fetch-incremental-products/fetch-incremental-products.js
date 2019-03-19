var runMe = function (payload, config, taskId, messageId) {

    const logger = require('sp-json-logger');
    var dbUrl = process.env.DB_URL;

    try {
        var utils = require('./../../jobs/utils/utils.js');
        var path = require('path');
        var MongoClient = require('mongodb').MongoClient;
        var ObjectId = require('mongodb').ObjectID;
        var _ = require('underscore');
        var Promise = require('bluebird');
        var vendSdk = require('vend-nodejs-sdk')({}); // why the {}?
        var vendConnectionInfo;
        var db = null; //database connected
        var incrementalProducts, productsToDelete, vendTags;

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

        try {
            process.env['User-Agent'] = taskId + ':' + messageId + ':' + commandName + ':' + payload.domainPrefix;
            logger.debug({
                messageId: messageId,
                commandName: commandName,
                message: 'This worker will fetch and save incremental products from vend to warehouse'
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
                    var argsForProducts = vendSdk.args.products.fetchAll();
                    argsForProducts.after.value = payload.versionsAfter;
                    argsForProducts.deleted.value = 1; //fetch all deleted products also
                    return vendSdk.products.fetchAll(argsForProducts, vendConnectionInfo);
                })
                .then(function (fetchedProducts) {
                    if (!fetchedProducts.length) {
                        return Promise.reject('noIncrementalProducts');
                    }
                    productsToDelete = _.filter(fetchedProducts, function (eachProduct) {
                        return eachProduct.deleted_at !== undefined && eachProduct.deleted_at !== null;
                    });
                    incrementalProducts = _.difference(fetchedProducts, productsToDelete);
                    logger.debug({
                        messageId: messageId,
                        commandName: commandName,
                        message: `Found ${incrementalProducts.length} new products, will filter only required data from them`
                    });
                    logger.debug({
                        messageId: messageId,
                        commandName: commandName,
                        message: `Found ${productsToDelete.length} deleted products, will delete them from the database`
                    });
                    logger.debug({
                        messageId: messageId,
                        commandName: commandName,
                        message: 'Will go on to look for vend tags'
                    });
                    var argsForTags = vendSdk.args.tags.fetch();
                    return vendSdk.tags.fetchAll(argsForTags, vendConnectionInfo);
                })
                .then(function (tags) {
                    logger.debug({
                        messageId: messageId,
                        commandName: commandName,
                        message: `Found ${tags.length} tags, will attach them to their products`
                    });
                    vendTags = tags;
                    return MongoClient.connect(dbUrl, {promiseLibrary: Promise});
                })
                .then(function (dbInstance) {
                    logger.debug({
                        messageId: messageId,
                        commandName: commandName,
                        message: 'Connected to mongodb database'
                    });
                    db = dbInstance;
                    logger.debug({
                        messageId: messageId,
                        commandName: commandName,
                        message: 'Will look for suppliers to attach to products'
                    });
                    return db.collection('SupplierModel').find({
                        storeConfigModelId: ObjectId(payload.storeConfigModelId)
                    }).toArray();
                })
                .then(function (supplierModelInstances) {
                    logger.debug({
                        messageId: messageId,
                        commandName: commandName,
                        message: `Found ${supplierModelInstances.length} suppliers, will attach them to products`
                    });

                    /**
                     * The code in this block also works. It may be beneficial to find out which one
                     * works faster. Also, if someday initializeUnorderedBulkOp() stops working, this
                     * may come in handy
                     *
                     // Create array of operations
                     var batch = [];
                     Add some operations to be executed
                     _.each(incrementalProducts, function (eachProduct) {
                        batch.push({
                          updateOne: {
                            filter: {
                              api_id: eachProduct.id
                            },
                            update: {
                              $set: {
                                name: eachProduct.name,
                                sku: eachProduct.sku,
                                supplier: eachProduct.supplier,
                                api_id: eachProduct.id,
                                storeConfigModelId: ObjectId(payload.storeConfigModelId)
                              }
                            },
                            upsert: true
                          }
                        });
                      });
                     Execute the operations
                     return db.collection('ProductModel').bulkWrite(batch);
                     */

                    var batch = db.collection('ProductModel').initializeUnorderedBulkOp();

                    _.each(incrementalProducts, function (eachProduct) {
                        var supplierModelToAttach = _.findWhere(supplierModelInstances, {api_id: eachProduct.supplier_id});
                        var tagsToAttach = '';
                        if (eachProduct.tag_ids && eachProduct.tag_ids.length) {
                            _.each(eachProduct.tag_ids, function (eachTagId) {
                                tagsToAttach = tagsToAttach + ',' + _.findWhere(vendTags, {id: eachTagId}).name;
                            });
                            //remove the first ","
                            tagsToAttach = tagsToAttach.substr(1, tagsToAttach.length);
                        }
                        batch.find({
                            api_id: eachProduct.id
                        }).upsert().updateOne({
                            $set: {
                                name: eachProduct.name,
                                supplierId: supplierModelToAttach ? supplierModelToAttach._id : null,
                                supplierVendId: supplierModelToAttach ? supplierModelToAttach.api_id : null,
                                supplierCode: eachProduct.supplier_code,
                                sku: eachProduct.sku,
                                type: eachProduct.type ? eachProduct.type.name : null,
                                supply_price: eachProduct.supply_price,
                                api_id: eachProduct.id,
                                tags: tagsToAttach,
                                storeConfigModelId: ObjectId(payload.storeConfigModelId)
                            }
                        })
                    });
                    _.each(productsToDelete, function (eachProduct) {
                        batch.find({
                            api_id: eachProduct.id
                        }).remove({
                            api_id: eachProduct.id
                        })
                    });
                    logger.debug({
                        messageId: messageId,
                        commandName: commandName,
                        message: 'Attached suppliers and filtered product objects, will download them into database'
                    });
                    return batch.execute()
                })
                .then(function (bulkInsertResponse) {
                    var result = {
                        ok: bulkInsertResponse.ok,
                        nInserted: bulkInsertResponse.nInserted,
                        nUpserted: bulkInsertResponse.nUpserted,
                        nMatched: bulkInsertResponse.nMatched,
                        nModified: bulkInsertResponse.nModified,
                        nRemoved: bulkInsertResponse.nRemoved
                    };
                    logger.debug({
                        messageId: messageId,
                        commandName: commandName,
                        message: 'Bulk insert operation complete',
                        result: result
                    });
                    logger.debug({
                        messageId: messageId,
                        commandName: commandName,
                        message: 'Will go on to update version no. in warehouse'
                    });
                    return db.collection('SyncModel').updateOne({
                            $and: [
                                {
                                    'storeConfigModelId': ObjectId(payload.storeConfigModelId)
                                },
                                {
                                    'name': 'products'
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
                .then(function (response) {
                    logger.debug({
                        messageId: messageId,
                        commandName: commandName,
                        message: 'Saved new version number for products',
                        result: response ? response.result || response : ''
                    });
                    return Promise.resolve();
                })
                .catch(function (error) {
                    if (error === 'noIncrementalProducts') {
                        logger.error({
                            messageId: messageId,
                            commandName: commandName,
                            message: 'No new products found, will exit worker'
                        });
                        if (db) {
                            return db.collection('SyncModel').updateOne({
                                    $and: [
                                        {
                                            'storeConfigModelId': ObjectId(payload.storeConfigModelId)
                                        },
                                        {
                                            'name': 'products'
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
                    }
                    logger.error({
                        messageId: messageId,
                        commandName: commandName,
                        message: 'Could not fetch and save products',
                        err: error
                    });
                    return Promise.reject(error);
                })
                .then(function (response) {
                    logger.debug({
                        messageId: messageId,
                        commandName: commandName,
                        message: 'Updated sync model for products',
                        result: response ? response.result || response : ''
                    });
                    return Promise.resolve();
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
                    return Promise.resolve();
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
