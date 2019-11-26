const logger = require('sp-json-logger')();
const sql = require('mssql');
const dbUrl = process.env.DB_URL;
const MongoClient = require('mongodb').MongoClient;
const ObjectId = require('mongodb').ObjectID;
var db = null; //database connected
const utils = require('./../../jobs/utils/utils.js');
const path = require('path');
sql.Promise = require('bluebird');
const _ = require('underscore');
const Promise = require('bluebird');
const PRODUCT_TABLE = 'EcoResProductV2Staging';
const PRODUCTS_PER_PAGE = 1000;
var commandName = path.basename(__filename, '.js'); // gives the filename without the .js extension

var runMe = function (sqlPool, orgModelId, productCategorySyncModel) {
    try {
        var incrementalProducts, productsToDelete;
        // Global variable for logging

        logger.debug({
            commandName: commandName,
            argv: process.argv,
            orgModelId,
            productCategorySyncModel
        });

        try {
            logger.debug({
                commandName: commandName,
                message: 'This worker will fetch and save categories of incremental products from MSD to warehouse'
            });
            return Promise.resolve()
                .then(function (pool) {
                    logger.debug({
                        message: 'Will connect to Mongo DB',
                        commandName
                    });
                    return MongoClient.connect(dbUrl, {promiseLibrary: Promise});
                })
                .catch(function (error) {
                    logger.error({
                        message: 'Could not connect to Mongo DB',
                        error,
                        commandName
                    });
                    return Promise.reject('Could not connect to Mongo DB');
                })
                .then(function (dbInstance) {
                    db = dbInstance;
                    logger.debug({
                        message: 'Connected to Mongo DB',
                        commandName
                    });
                    var pagesToFetch = Math.ceil(productCategorySyncModel.rowCount / PRODUCTS_PER_PAGE);
                    logger.debug({
                        message: 'Found the count of total products to insert/update',
                        count: productCategorySyncModel.rowCount,
                        pagesToFetch,
                        commandName
                    });
                    return fetchPaginatedProducts(sqlPool, orgModelId, pagesToFetch);
                })
                .then(function (result) {
                    logger.debug({
                        commandName: commandName,
                        message: 'Downloaded products to the DB',
                        result
                    });
                    logger.debug({
                        commandName: commandName,
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
                                'syncInProcess': false,
                                'workerTaskId': '',
                                'lastSyncedAt': new Date()
                            }
                        });
                })
                .then(function (response) {
                    logger.debug({
                        commandName: commandName,
                        message: 'Updated product sync model in DB',
                        result: response ? response.result || response : ''
                    });
                    return Promise.resolve();
                })
                .catch(function (error) {
                    logger.error({
                        commandName: commandName,
                        message: 'Could not fetch and save products',
                        err: error
                    });
                    return Promise.reject(error);
                })
                .finally(function () {
                    logger.debug({
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
                        commandName: commandName,
                        message: 'Could not close db connection',
                        err: error
                    });
                    return Promise.resolve();
                    //TODO: set a timeout, after which close all listeners
                });
        }
        catch (e) {
            logger.error({commandName: commandName, message: '2nd last catch block', err: e});
            throw e;
        }
    }
    catch (e) {
        logger.error({message: 'last catch block', err: e, commandName});
        throw e;
    }
};


module.exports = {
    run: runMe
};

function fetchPaginatedProducts(sqlPool, orgModelId, pagesToFetch) {
    var incrementalProducts, rowIds;
    if (pagesToFetch>0) {
        return sqlPool.request()
            .input('products_per_page', sql.Int, PRODUCTS_PER_PAGE)
            .input('transfer_pending_state', sql.Int, 0)
            .query('SELECT TOP (@products_per_page) PRODUCTNUMBER, RETAILPRODUCTCATEGORYNAME, %%physloc%% ROWID' +
                ' FROM ' + PRODUCT_TABLE +
                ' WHERE STOCKUPTRANSFER = @transfer_pending_state')
            .then(function (result) {
                incrementalProducts = result.recordset;
                rowIds = [];
                rowIds = _.map(incrementalProducts, function (eachProduct) {
                    return '0x' + eachProduct.ROWID.toString('hex'); //TODO: find a better way of uniquely recognizing rows
                });
                logger.debug({
                    message: 'Fetched products',
                    pagesToFetch,
                    numberOfProducts: incrementalProducts.length,
                    commandName
                });
                var productCategories = _.pluck(incrementalProducts, 'RETAILPRODUCTCATEGORYNAME');
                logger.debug({
                    message: 'Will look for their categories in database',
                    numberOfCategories: productCategories.length,
                    functionName: 'fetchPaginatedProducts',
                    commandName
                });
                return db.collection('CategoryModel').find({
                    name: {
                        $in: productCategories
                    }
                }).toArray();
            })
            .catch(function (error) {
                logger.error({
                    message: 'Could not find category model instances',
                    error,
                    functionName: 'fetchPaginatedProducts',
                    commandName
                });
                return Promise.reject('Could not find category model instances');
            })
            .then(function (categoryModelInstances) {
                logger.debug({
                    message: 'Found category model instances',
                    numberOfCategoriesFound: categoryModelInstances.length,
                    functionName: 'fetchPaginatedProducts',
                    commandName
                });
                var batch = db.collection('ProductModel').initializeUnorderedBulkOp();
                _.each(incrementalProducts, function (eachProduct) {
                    var categoryModel = _.findWhere(categoryModelInstances, {name: eachProduct.RETAILPRODUCTCATEGORYNAME});
                    if (categoryModel) {
                        batch.find({
                            api_id: eachProduct.PRODUCTNUMBER
                        }).upsert().updateOne({
                            $set: {
                                categoryModelId: categoryModel ? categoryModel._id : null,
                                updated: new Date()
                            }
                        });
                    }
                    else {
                        batch.find({
                            api_id: eachProduct.PRODUCTNUMBER
                        }).upsert().updateOne({
                            $set: {
                                categoryModel: eachProduct.RETAILPRODUCTCATEGORYNAME,
                                updated: new Date()
                            }
                        });
                    }
                });
                return batch.execute();
            })
            .then(function (result) {
                logger.debug({
                    message: 'Inserted/updated categories in products in DB',
                    result: {
                        upserted: result.nUpserted,
                        inserted: result.nInserted
                    },
                    commandName
                });
                logger.debug({
                    message: 'Will delete the inserted/updated products from Azure SQL',
                    commandName
                });
                return sqlPool.request()
                    .input('products_per_page', sql.Int, PRODUCTS_PER_PAGE)
                    .input('transfer_success_state', sql.Int, 1)
                    .input('transfer_time', sql.DateTime, new Date())
                    .query('UPDATE TOP (@products_per_page) ' + PRODUCT_TABLE +
                        ' SET STOCKUPTRANSFER = @transfer_success_state, STOCKUPTRANSFERTIME = @transfer_time' +
                        ' WHERE %%physloc%% IN (' + rowIds + ')');
            })
            .then(function (result) {
                logger.debug({
                    message: 'Deleted selected products from Azure SQL',
                    result,
                    commandName
                });
                logger.debug({
                    message: 'Will go on to fetch the next page',
                    pagesToFetch,
                    commandName
                });
                pagesToFetch--;
                return fetchPaginatedProducts(sqlPool, orgModelId, pagesToFetch);
            });
    }
    else {
        logger.debug({
            message: 'Executed all pages',
            pagesToFetch,
            commandName
        });
        return Promise.resolve('Executed all pages: ' + pagesToFetch);
    }
}
