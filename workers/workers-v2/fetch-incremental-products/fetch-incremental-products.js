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
var productsBatchNumber = 0;

var runMe = function (vendConnectionInfo, orgModelId, versionsAfter) {

    var db = null;
    logger.debug({
        orgModelId,
        message: 'This worker will fetch and save incremental products from vend to warehouse'
    });
    return MongoClient.connect(dbUrl, {promiseLibrary: Promise})
        .then(function (dbInstance) {
            db = dbInstance;
            logger.debug({
                orgModelId,
                message: 'Connected to mongodb database',
            });
            return fetchProductsRecursively(dbInstance, vendConnectionInfo, orgModelId, versionsAfter);
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

function fetchProductsRecursively(dbInstance, vendConnectionInfo, orgModelId, versionsAfter) {
    productsBatchNumber++;
    var argsForProducts = vendSdk.args.products.fetch();
    argsForProducts.after.value = versionsAfter;
    argsForProducts.deleted.value = 1; //fetch all deleted products also
    return vendSdk.products.fetch(argsForProducts, vendConnectionInfo)
        .catch(function (error) {
            logger.error({
                message: 'Could not fetch products from Vend',
                orgModelId,
                productsBatchNumber,
                error,
                functionName: 'fetchProductsRecursively'
            });
            return Promise.reject('Could not fetch products from Vend');
        })
        .then(function (response) {
            if (response && response.data && response.data.length) {
                logger.debug({
                    message: 'Fetched products data from vend, will save to DB',
                    productsCount: response.data.length,
                    orgModelId,
                    productsBatchNumber,
                    functionName: 'fetchProductsRecursively'
                });
                return saveProducts(dbInstance, vendConnectionInfo, orgModelId, response);
            }
            else if (response && response.data && !response.data.length) {
                logger.debug({
                    message: 'No more products to fetch, will exit worker',
                    orgModelId,
                    productsBatchNumber,
                    functionName: 'fetchProductsRecursively'
                });
                return Promise.resolve('noIncrementalProducts');
            }
            else {
                logger.debug({
                    message: 'Vend API returning null response',
                    response,
                    productsBatchNumber,
                    orgModelId,
                    functionName: 'fetchProductsRecursively'
                });
                return Promise.reject();
            }
        });
}

function saveProducts(dbInstance, vendConnectionInfo, orgModelId, products) {
    var supplierIds = _.uniq(_.pluck(products.data, 'supplier_id'));
    var categoryIds = _.chain(products.data).pluck('type').pluck('id').uniq().value();
    var productsToDelete = _.filter(products.data, function (eachProduct) {
        return eachProduct.deleted_at !== undefined && eachProduct.deleted_at !== null;
    });
    var productsToSave = _.difference(products.data, productsToDelete);
    logger.debug({
        message: 'Will look for tags from Vend to attach to products',
        orgModelId,
        functionName: 'saveProducts',
        productsBatchNumber
    });
    var vendTags;
    var argsForTags = vendSdk.args.tags.fetch();
    return vendSdk.tags.fetchAll(argsForTags, vendConnectionInfo)
        .then(function (tags) {
            logger.debug({
                message: 'Found tags from Vend',
                tagsCount: tags.length,
                functionName: 'saveProducts',
                productsBatchNumber,
                orgModelId
            });
            vendTags = tags;
            logger.debug({
                orgModelId,
                message: 'Will look for suppliers and categories to attach to products',
                functionName: 'saveProducts',
                productsToSave: productsToSave.length,
                productsToDelete: productsToDelete.length,
                suppliersCount: supplierIds.length,
                categoriesCount: categoryIds.length,
                productsBatchNumber
            });
            return Promise.all([
                dbInstance.collection('SupplierModel').find({
                    orgModelId: ObjectId(orgModelId),
                    api_id: {
                        $in: supplierIds
                    }
                }).toArray(),
                dbInstance.collection('CategoryModel').find({
                    orgModelId: ObjectId(orgModelId),
                    api_id: {
                        $in: categoryIds
                    }
                }).toArray()

            ]);
        })
        .then(function (response) {
            let supplierModelInstances = response[0];
            let categoryModelInstances = response[1];
            logger.debug({
                orgModelId,
                message: 'Found suppliers and categories in DB, will attach to products',
                productsBatchNumber,
                suppliersCount: supplierModelInstances.length,
                categoriesCount: categoryModelInstances.length,
                functionName: 'saveProducts'
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

            var batch = dbInstance.collection('ProductModel').initializeUnorderedBulkOp();
            _.each(productsToSave, function (eachProduct) {
                var supplierModelToAttach = _.findWhere(supplierModelInstances, {api_id: eachProduct.supplier_id});
                var categoryModelToAttach = _.findWhere(categoryModelInstances, {api_id: eachProduct.type ? eachProduct.type.id : ''});
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
                        categoryModelVendId: categoryModelToAttach ? categoryModelToAttach.api_id : null,
                        categoryModelId: categoryModelToAttach ? categoryModelToAttach._id : null,
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
                message: 'Attached suppliers and filtered product objects, will download them into database',
                productsBatchNumber,
                functionName: 'saveProducts'
            });
            return executeBatch(batch, orgModelId);
        })
        .catch(function (error) {
            logger.error({
                message: 'Could not execute batch operation, will exit',
                error,
                productsBatchNumber,
                functionName: 'saveProducts',
                orgModelId
            });
            return Promise.reject();
        })
        .then(function () {
            logger.debug({
                orgModelId,
                message: 'Successfully executed batch of Products, will update version number in DB',
                productsBatchNumber,
                functionName: 'saveProducts'
            });
            return dbInstance.collection('SyncModel').updateOne({
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
                        'version': products.version.max,
                        'lastSyncedAt': new Date()
                    }
                });
        })
        .catch(function (error) {
            logger.error({
                message: 'Could not update version number in DB, will stop sync',
                error,
                orgModelId,
                productsBatchNumber,
                functionName: 'saveProducts'
            });
            return Promise.reject('Could not update version number in DB, will stop sync');
        })
        .then(function () {
            return fetchProductsRecursively(dbInstance, vendConnectionInfo, orgModelId, products.version.max);
        });
}

function executeBatch(batch, orgModelId) {
    return new Promise(function (resolve, reject) {
        logger.debug({
            orgModelId,
            message: `Executing batch of products`,
            productsBatchNumber,
            functionName: 'executeBatch'
        });
        if (batch.s && batch.s.currentBatch && batch.s.currentBatch.operations) {
            batch.execute(function (err, result) {
                if (err) {
                    logger.error({
                        orgModelId,
                        message: `ERROR in batch`,
                        productsBatchNumber,
                        err: err,
                        functionName: 'executeBatch'
                    });
                    reject(err);
                }
                else {
                    logger.debug({
                        orgModelId,
                        message: `Successfully executed batch operation`,
                        productsBatchNumber,
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
                productsBatchNumber,
                message: `Skipping empty batch`,
                functionName: 'executeBatch'
            });
            resolve('Skipped');
        }
    });
}
