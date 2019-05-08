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
const SALES_TABLE = 'RetailTransactionStaging';
const SALES_PER_PAGE = 1000;
const commandName = path.basename(__filename, '.js'); // gives the filename without the .js extension

var runMe = function (sqlPool, orgModelId, salesSyncModel) {
    try {
        // Global variable for logging

        logger.debug({
            commandName: commandName,
            argv: process.argv,
            orgModelId,
            salesSyncModel
        });

        try {
            logger.debug({
                commandName: commandName,
                message: 'This worker will fetch and save incremental sales from MSD to warehouse'
            });
            return Promise.resolve()
                .then(function () {
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
                    var pagesToFetch = Math.ceil(salesSyncModel.rowCount / SALES_PER_PAGE);
                    logger.debug({
                        message: 'Found the count of total sales to insert/update',
                        count: salesSyncModel.rowCount,
                        pagesToFetch,
                        commandName
                    });
                    return fetchPaginatedSales(sqlPool, orgModelId, pagesToFetch);
                })
                .then(function (result) {
                    logger.debug({
                        commandName: commandName,
                        message: 'Downloaded inventory to the DB',
                        result
                    });
                    logger.debug({
                        commandName: commandName,
                        message: 'Will go on to update status in DB'
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
                                'syncInProcess': false,
                                'workerTaskId': '',
                                'lastSyncedAt': new Date()
                            }
                        });
                })
                .then(function (response) {
                    logger.debug({
                        commandName: commandName,
                        message: 'Updated inventory sync model in DB',
                        result: response ? response.result || response : ''
                    });
                    return Promise.resolve();
                })
                .catch(function (error) {
                    logger.error({
                        commandName: commandName,
                        message: 'Could not fetch and save inventory',
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

function fetchPaginatedSales(sqlPool, orgModelId, pagesToFetch) {
    var incrementalSales;
    if (pagesToFetch>0) {
        return sqlPool.request()
            .input('sales_per_page', sql.Int, SALES_PER_PAGE)
            .input('transfer_pending_state', sql.Int, 0)
            .query('SELECT TOP (@sales_per_page) * FROM ' + SALES_TABLE + ' WHERE STOCKUPTRANSFER = @transfer_pending_state')
            .then(function (result) {
                incrementalSales = result.recordset;
                logger.debug({
                    message: 'Fetched sales',
                    pagesToFetch,
                    numberOfSales: incrementalSales.length,
                    commandName
                });
                //Fetch all storeModels for this sales
                return db.collection('StoreModel').find({
                    "orgModelId": ObjectId(orgModelId)
                }).toArray();
            })
            .then(function (result) {
                var storeModelInstances = result;
                logger.debug({
                    commandName: commandName,
                    message: `Found ${storeModelInstances.length} store model instances`
                });
                logger.debug({
                    commandName: commandName,
                    message: 'Will attach stores to sales'
                });
                //Initialize the array of unordered batches
                var batch = db.collection('SalesModel').initializeUnorderedBulkOp();
                var batchCounter = 0, salesCounter = 0;
                //Add some operations to be executed
                _.each(incrementalSales, function (eachSales, iteratee) {
                    var storeModelToAttach = _.findWhere(storeModelInstances, {storeNumber: eachSales.WAREHOUSE});
                    if(storeModelToAttach && eachSales.TRANSACTIONSTATUS === 2) {
                        batch.find({
                            transactionNumber: eachSales.TRANSACTIONNUMBER
                        }).upsert().updateOne({
                            $set: {
                                transactionNumber: eachSales.TRANSACTIONNUMBER,
                                currency: eachSales.CURRENCY,
                                storeModelId: storeModelToAttach ? storeModelToAttach._id : null,
                                isReturnSale: eachSales.SALEISRETURNSALE,
                                netAmount: eachSales.NETAMOUNT,
                                grossAmount: eachSales.GROSSAMOUNT,
                                discountAmount: eachSales.DISCOUNTAMOUNT,
                                salesDate: eachSales.TRANSACTIONDATE,
                                orgModelId: ObjectId(orgModelId),
                                updatedAt: new Date()
                            }
                        });
                    }
                    process.stdout.write('\033[0G');
                    process.stdout.write('Percentage completed: ' + Math.round((iteratee++ / salesCounter.length) * 100) + '%');
                    salesCounter++;
                });
                logger.debug({
                    commandName: commandName,
                    message: `Batch of sales ready`,
                    pagesToFetch
                });
                return batch.execute();
            })
            .then(function (bulkInsertResponse) {
                logger.debug({
                    commandName: commandName,
                    message: 'Bulk insert operation complete'
                });
                logger.debug({
                    message: 'Inserted/updated inventory in DB',
                    result: {
                        upserted: bulkInsertResponse.nUpserted,
                        inserted: bulkInsertResponse.nInserted
                    },
                    commandName
                });
                logger.debug({
                    message: 'Will delete the inserted/updated inventory from Azure SQL',
                    commandName
                });
                return sqlPool.request()
                    .input('sales_per_page', sql.Int, SALES_PER_PAGE)
                    .input('transfer_pending_state', sql.Int, 0)
                    .input('transfer_success_state', sql.Int, 1)
                        .input('transfer_time', sql.DateTime, new Date())
                    .query('UPDATE TOP (@sales_per_page) ' + SALES_TABLE + ' SET STOCKUPTRANSFER = @transfer_success_state, STOCKUPTRANSFERTIME = @transfer_time WHERE STOCKUPTRANSFER = @transfer_pending_state ');
            })
            .then(function (result) {
                logger.debug({
                    message: 'Deleted selected sales from Azure SQL',
                    result,
                    commandName
                });
                logger.debug({
                    message: 'Will go on to fetch the next page',
                    pagesToFetch,
                    commandName
                });
                pagesToFetch--;
                return fetchPaginatedSales(sqlPool, orgModelId, pagesToFetch);
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
