var runMe = function (vendConnectionInfo, orgModelId, dataObject) {

    const path = require('path');
    const commandName = path.basename(__filename, '.js'); // gives the filename without the .js extension
    const logger = require('sp-json-logger')({fileName: 'workers:workers-v2:' + commandName});
    var dbUrl = process.env.DB_URL;
    try {
        var utils = require('./../../jobs/utils/utils.js');
        var MongoClient = require('mongodb').MongoClient;
        var ObjectId = require('mongodb').ObjectID;
        var _ = require('underscore');
        var Promise = require('bluebird');
        var vendSdk = require('vend-nodejs-sdk')({}); // why the {}?
        var db = null; //database connected
        var incrementalProducts, productsToDelete, vendTags;

        try {
            // process.env['User-Agent'] = taskId + ':' + messageId + ':' + commandName + ':' + payload.domainPrefix;
            logger.debug({
                orgModelId,
                message: 'This worker will fetch and save incremental products from vend to warehouse'
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
                    var argsForProducts = vendSdk.args.products.fetchAll();
                    argsForProducts.after.value = dataObject.versionsAfter;
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
                        orgModelId,
                        message: `Found ${incrementalProducts.length} new products, will filter only required data from them`
                    });
                    logger.debug({
                        orgModelId,
                        message: `Found ${productsToDelete.length} deleted products, will delete them from the database`
                    });
                    logger.debug({
                        orgModelId,
                        message: 'Will go on to look for vend tags'
                    });
                    var argsForTags = vendSdk.args.tags.fetch();
                    return vendSdk.tags.fetchAll(argsForTags, vendConnectionInfo);
                })
                .then(function (tags) {
                    logger.debug({
                        orgModelId,
                        message: `Found ${tags.length} tags, will attach them to their products`
                    });
                    vendTags = tags;
                    return MongoClient.connect(dbUrl, {promiseLibrary: Promise});
                })
                .then(function (dbInstance) {
                    logger.debug({
                        orgModelId,
                        message: 'Connected to mongodb database'
                    });
                    db = dbInstance;
                    logger.debug({
                        orgModelId,
                        message: 'Will look for suppliers to attach to products'
                    });
                    return Promise.all([
                        db.collection('SupplierModel').find({
                            orgModelId: ObjectId(orgModelId)
                        }).toArray(),
                        db.collection('CategoryModel').find({
                            orgModelId: ObjectId(orgModelId)
                        }).toArray()
                    ]);
                })
                .then(function (response) {
                    let supplierModelInstances = response[0];
                    let categoryModelInstances = response[1];
                    logger.debug({
                        orgModelId,
                        message: `Found ${supplierModelInstances.length} suppliers and ${categoryModelInstances.length} categories, will attach them to products`
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
                        var categoryModelToAttach = _.findWhere(categoryModelInstances, {api_id: eachProduct.type ? eachProduct.type.id: ''});
                        var tagsToAttach = '';
                        if (eachProduct.tag_ids && eachProduct.tag_ids.length) {
                            _.each(eachProduct.tag_ids, function (eachTagId) {
                                tagsToAttach = tagsToAttach + ',' + _.findWhere(vendTags, {id: eachTagId}).name;
                            });
                            //remove the first ","
                            tagsToAttach = tagsToAttach.substr(1, tagsToAttach.length);
                        }
                        batch.find({
                            orgModelId: ObjectId(orgModelId),
                            api_id: eachProduct.id
                        }).upsert().updateOne({
                            $set: {
                                name: eachProduct.name,
                                supplierModelId: supplierModelToAttach ? supplierModelToAttach._id : null,
                                supplierVendId: supplierModelToAttach ? supplierModelToAttach.api_id : null,
                                supplierCode: eachProduct.supplier_code,
                                sku: eachProduct.sku,
                                categoryModelVendId: categoryModelToAttach ? categoryModelToAttach.api_id: null,
                                categoryModelId: categoryModelToAttach ? categoryModelToAttach._id: null,
                                supply_price: eachProduct.supply_price,
                                api_id: eachProduct.id,
                                tags: tagsToAttach,
                                orgModelId: ObjectId(orgModelId),
                                updatedAt: new Date()
                            }
                        })
                    });
                    _.each(productsToDelete, function (eachProduct) {
                        batch.find({
                            orgModelId: ObjectId(orgModelId),
                            api_id: eachProduct.id
                        }).remove({
                            api_id: eachProduct.id
                        })
                    });
                    logger.debug({
                        orgModelId,
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
                        orgModelId,
                        message: 'Bulk insert operation complete',
                        result: result
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
                                    'name': 'products'
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
                .then(function (response) {
                    logger.debug({
                        orgModelId,
                        message: 'Saved new version number for products',
                        result: response ? response.result || response : ''
                    });
                    return Promise.resolve();
                })
                .catch(function (error) {
                    if (error === 'noIncrementalProducts') {
                        logger.error({
                            orgModelId,
                            message: 'No new products found, will exit worker'
                        });
                        // if (db) {
                        //     return db.collection('SyncModel').updateOne({
                        //             $and: [
                        //                 {
                        //                     'storeConfigModelId': ObjectId(payload.storeConfigModelId)
                        //                 },
                        //                 {
                        //                     'name': 'products'
                        //                 }
                        //             ],
                        //         },
                        //         {
                        //             $set: {
                        //                 'syncInProcess': false,
                        //                 'workerTaskId': '',
                        //                 'lastSyncedAt': new Date()
                        //             }
                        //         });
                        // }
                        return Promise.resolve();
                    }
                    logger.error({
                        orgModelId,
                        message: 'Could not fetch and save products',
                        err: error
                    });
                    return Promise.reject(error);
                })
                .then(function (response) {
                    logger.debug({
                        orgModelId,
                        message: 'Updated sync model for products',
                        result: response ? response.result || response : ''
                    });
                    return Promise.resolve();
                })
                .finally(function () {
                    logger.debug({
                        orgModelId,
                        message: 'Closing database connection'
                    });
                    if (db) {
                        return db.close();
                    }
                    return Promise.resolve();
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
