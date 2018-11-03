var runMe = function (payload, config, taskId, messageId) {

    const logger = require('sp-json-logger')();
    const dbUrl = process.env.DB_URL;

    try {
        const utils = require('./../../jobs/utils/utils.js');
        const path = require('path');
        const sql = require('mssql');
        sql.Promise = require('bluebird');
        const MongoClient = require('mongodb').MongoClient;
        const ObjectId = require('mongodb').ObjectID;
        const _ = require('underscore');
        const Promise = require('bluebird');
        var db = null; //database connected
        var sqlPool = null;
        var incrementalProducts, productsToDelete;

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
                message: 'This worker will fetch and save incremental products from MSD to warehouse'
            });
            return Promise.resolve()
                .then(function () {
                    logger.debug({
                        message: 'Connecting to MS SQL on Azure',
                        messageId,
                        commandName
                    });
                    const sqlConfig = {
                        user: process.env.AZURE_SQL_USER,
                        password: process.env.AZURE_SQL_PASSWORD,
                        server: process.env.AZURE_SQL_SERVER, // You can use 'localhost\\instance' to connect to named instance
                        database: process.env.AZURE_SQL_DB,
                        options: {
                            encrypt: true // Use this if you're on Windows Azure
                        }
                    };
                    return sql.connect(sqlConfig);
                })
                .catch(function (error) {
                    logger.error({
                        message: 'Could not connect to MS SQL on Azure',
                        error,
                        messageId,
                        commandName
                    });
                    return Promise.reject('Could not connect to MS SQL on Azure');
                })
                .then(function (pool) {
                    logger.debug({
                        message: 'Connected to MS SQL on Azure',
                        messageId,
                        commandName
                    });
                    sqlPool = pool;
                    logger.debug({
                        message: 'Will connect to Mongo DB',
                        messageId,
                        commandName
                    });
                    return MongoClient.connect(dbUrl, {promiseLibrary: Promise});
                })
                .catch(function (error) {
                    logger.error({
                        message: 'Could not connect to Mongo DB',
                        error,
                        messageId,
                        commandName
                    });
                    return Promise.reject('Could not connect to Mongo DB');
                })
                .then(function (dbInstance) {
                    logger.debug({
                        message: 'Connected to Mongo DB',
                        messageId,
                        commandName
                    });
                    return fetchPaginatedProducts();
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
                        orgModelId: ObjectId(payload.orgModelId)
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
                                orgModelId: ObjectId(payload.orgModelId)
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
                                sku: eachProduct.sku,
                                type: eachProduct.type ? eachProduct.type.name : null,
                                supply_price: eachProduct.supply_price,
                                api_id: eachProduct.id,
                                tags: tagsToAttach,
                                orgModelId: ObjectId(payload.orgModelId)
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
                    return batch.execute();
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
                                    'orgModelId': ObjectId(payload.orgModelId)
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
                                            'orgModelId': ObjectId(payload.orgModelId)
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
