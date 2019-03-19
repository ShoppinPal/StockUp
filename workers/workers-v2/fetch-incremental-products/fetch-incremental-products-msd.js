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
const PRODUCT_TABLE = 'EcoResProductVariantStaging';
const PRODUCTS_PER_PAGE = 1000;
// Global variable for logging
var commandName = path.basename(__filename, '.js'); // gives the filename without the .js extension

var runMe = function (sqlPool, orgModelId, productSyncModel) {
    try {
        var incrementalProducts, productsToDelete;

        logger.debug({
            commandName: commandName,
            argv: process.argv,
            orgModelId,
            productSyncModel
        });

        try {
            logger.debug({
                commandName: commandName,
                message: 'This worker will fetch and save incremental products from MSD to warehouse'
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
                    var pagesToFetch = Math.ceil(productSyncModel.rowCount / PRODUCTS_PER_PAGE);
                    logger.debug({
                        message: 'Found the count of total products to insert/update',
                        count: productSyncModel.rowCount,
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
        logger.error({commandName, message: 'last catch block', err: e});
        throw e;
    }
};


module.exports = {
    run: runMe
};

function fetchPaginatedProducts(sqlPool, orgModelId, pagesToFetch) {
    var incrementalProducts;
    if (pagesToFetch>0) {
        return sqlPool.request()
            .input('products_per_page', sql.Int, PRODUCTS_PER_PAGE)
            .input('transfer_pending_state', sql.Int, 0)
            .query('SELECT TOP (@products_per_page) * FROM ' + PRODUCT_TABLE + ' WHERE STOCKUPTRANSFER = @transfer_pending_state')
            .then(function (result) {
                incrementalProducts = result.recordset;
                logger.debug({
                    message: 'Fetched products',
                    pagesToFetch,
                    numberOfProducts: incrementalProducts.length
                });
                var batch = db.collection('ProductModel').initializeUnorderedBulkOp();
                _.each(incrementalProducts, function (eachProduct) {
                    batch.find({
                        api_id: eachProduct.PRODUCTMASTERNUMBER
                    }).upsert().updateOne({
                        $set: {
                            api_id: eachProduct.PRODUCTMASTERNUMBER,
                            name: eachProduct.PRODUCTNAME,
                            sizeId: eachProduct.PRODUCTSIZEID,
                            colorId: eachProduct.PRODUCTCOLORID,
                            styleId: eachProduct.PRODUCTSTYLEID,
                            configurationId: eachProduct.PRODUCTCONFIGURATIONID,
                            sku: eachProduct.PRODUCTVARIANTNUMBER,
                            orgModelId: ObjectId(orgModelId),
                            updated: new Date()
                        }
                    })
                });
                return batch.execute();
            })
            .then(function (result) {
                logger.debug({
                    message: 'Inserted/updated products in DB',
                    result: {
                        upserted: result.nUpserted,
                        inserted: result.nInserted
                    }
                });
                logger.debug({
                    message: 'Will delete the inserted/updated products from Azure SQL',
                    commandName
                });
                return sqlPool.request()
                    .input('products_per_page', sql.Int, PRODUCTS_PER_PAGE)
                    .input('transfer_pending_state', sql.Int, 0)
                    .input('transfer_success_state', sql.Int, 1)
                    .query('UPDATE TOP (@products_per_page) ' + PRODUCT_TABLE+' SET STOCKUPTRANSFER = @transfer_success_state WHERE STOCKUPTRANSFER = @transfer_pending_state ');
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
