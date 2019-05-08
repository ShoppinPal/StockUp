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
const SALES_LINES_TABLE = 'RetailTransactionSalesLineStaging';
const SALES_LINES_PER_PAGE = 1000;
const commandName = path.basename(__filename, '.js'); // gives the filename without the .js extension

var runMe = function (sqlPool, orgModelId, salesLineSyncModel) {
    try {
        // Global variable for logging

        logger.debug({
            commandName: commandName,
            argv: process.argv,
            orgModelId,
            salesLineSyncModel
        });

        try {
            logger.debug({
                commandName: commandName,
                message: 'This worker will fetch and save incremental sales lines from MSD to warehouse'
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
                        message: 'Connected to Mongo DB, will set the sync process as true',
                        commandName
                    });
                    return db.collection('SyncModel').updateOne({
                            $and: [
                                {
                                    'orgModelId': ObjectId(orgModelId)
                                },
                                {
                                    'name': 'salesLines'
                                }
                            ],
                        },
                        {
                            $set: {
                                'syncInProcess': true,
                            }
                        });
                })
                .then(function (result) {
                    var pagesToFetch = Math.ceil(salesLineSyncModel.rowCount / SALES_LINES_PER_PAGE);
                    logger.debug({
                        message: 'Found the count of total sales lines to insert/update',
                        count: salesLineSyncModel.rowCount,
                        pagesToFetch,
                        commandName
                    });
                    return fetchPaginatedSalesLines(sqlPool, orgModelId, pagesToFetch);
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
                                    'name': 'salesLines'
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
                        message: 'Updated sales lines sync model in DB',
                        result: response ? response.result || response : ''
                    });
                    return Promise.resolve();
                })
                .catch(function (error) {
                    logger.error({
                        commandName: commandName,
                        message: 'Could not fetch and save sales lines',
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

function fetchPaginatedSalesLines(sqlPool, orgModelId, pagesToFetch) {
    var incrementalSalesLines;
    if (pagesToFetch>0) {
        return sqlPool.request()
            .input('sales_lines_per_page', sql.Int, SALES_LINES_PER_PAGE)
            .input('transfer_pending_state', sql.Int, 0)
            .query('SELECT TOP (@sales_lines_per_page) * FROM ' + SALES_LINES_TABLE + ' WHERE STOCKUPTRANSFER = @transfer_pending_state')
            .then(function (result) {
                incrementalSalesLines = result.recordset;
                logger.debug({
                    message: 'Fetched sales lines',
                    pagesToFetch,
                    numberOfSales: incrementalSalesLines.length,
                    commandName
                });
                var incrementalItemIDs = _.pluck(incrementalSalesLines, 'ITEMID');
                var incrementalTransactionNumbers = _.pluck(incrementalSalesLines, 'TRANSACTIONNUMBER');
                //Fetch all storeModels for this sales
                return Promise.all([
                    db.collection('ProductModel').find({
                        "orgModelId": ObjectId(orgModelId),
                        "api_id": {
                            $in: incrementalItemIDs
                        }
                    }).toArray(),
                    db.collection('SalesModel').find({
                        "orgModelId": ObjectId(orgModelId),
                        "transactionNumber": {
                            $in: incrementalTransactionNumbers
                        }
                    }).toArray()
                ]);
            })
            .catch(function (error) {
                logger.error({
                    message: 'Could not fetch product and sales model instances',
                    error,
                    commandName
                });
                return Promise.reject('Could not fetch product and sales model instances');
            })
            .then(function (result) {
                var productModelInstances = result[0];
                var salesModelInstances = result[1];
                logger.debug({
                    commandName: commandName,
                    message: `Found ${productModelInstances.length} product model instances`
                });
                logger.debug({
                    commandName: commandName,
                    message: `Found ${salesModelInstances.length} sales model instances`
                });
                logger.debug({
                    commandName: commandName,
                    message: 'Will attach stores, products and sales model to sales lines'
                });
                //Initialize the array of unordered batches
                var batch = db.collection('SalesLineItemsModel').initializeUnorderedBulkOp();
                var batchCounter = 0;
                //Add some operations to be executed
                _.each(incrementalSalesLines, function (eachSalesLine, iteratee) {
                    var salesModelToAttach = _.findWhere(salesModelInstances, {transactionNumber: eachSalesLine.TRANSACTIONNUMBER});
                    var productModelToAttach = _.findWhere(productModelInstances, {api_id: eachSalesLine.ITEMID});
                    if (salesModelToAttach && eachSalesLine.TRANSACTIONSTATUS === 2) {
                        batch.find({
                            $and: [{
                                transactionNumber: eachSalesLine.TRANSACTIONNUMBER
                            }, {
                                lineNumber: eachSalesLine.LINENUMBER
                            }]
                        }).upsert().updateOne({
                            $set: {
                                transactionNumber: eachSalesLine.TRANSACTIONNUMBER,
                                lineNumber: eachSalesLine.LINENUMBER,
                                isReturnSale: eachSalesLine.ISRETURNNOSALE,
                                currency: eachSalesLine.CURRENCY,
                                netAmount: eachSalesLine.NETAMOUNT,
                                discountAmount: eachSalesLine.TOTALDISCOUNT,
                                taxAmount: eachSalesLine.SALESTAXAMOUNT,
                                costPrice: eachSalesLine.COSTAMOUNT,
                                quantity: -(eachSalesLine.QUANTITY),
                                salesDate: salesModelToAttach.salesDate,
                                salesModelId: salesModelToAttach ? salesModelToAttach._id : null,
                                productModelId: productModelToAttach ? productModelToAttach._id : null,
                                storeModelId: salesModelToAttach ? salesModelToAttach.storeModelId : null,
                                orgModelId: ObjectId(orgModelId),
                                updatedAt: new Date()
                            }
                        });
                        batchCounter++;
                    }
                    process.stdout.write('\033[0G');
                    process.stdout.write('Percentage completed: ' + Math.round((iteratee++ / incrementalSalesLines.length) * 100) + '%');
                });
                logger.debug({
                    commandName: commandName,
                    message: `Batch of sales lines ready`,
                    pagesToFetch
                });
                if (batchCounter) {
                    return batch.execute();
                }
                else {
                    return Promise.resolve('Empty batch');
                }
            })
            .catch(function (error) {
                logger.error({
                    message: 'Could not execute the batch, will move on to the next batch',
                    error,
                    commandName
                });
                return Promise.resolve('ERROR_BATCH');
            })
            .then(function (bulkInsertResponse) {
                if(bulkInsertResponse === 'ERROR_BATCH') {
                    return Promise.resolve();
                }
                else {
                    logger.debug({
                        commandName: commandName,
                        message: 'Bulk insert operation complete'
                    });
                    logger.debug({
                        commandName,
                        nUpserted: bulkInsertResponse.nUpserted,
                        nInserted: bulkInsertResponse.nInserted,
                    });
                    logger.debug({
                        message: 'Will delete the inserted/updated sales lines from Azure SQL'
                    });
                    return sqlPool.request()
                        .input('sales_lines_per_page', sql.Int, SALES_LINES_PER_PAGE)
                        .input('transfer_pending_state', sql.Int, 0)
                        .input('transfer_success_state', sql.Int, 1)
                        .input('transfer_time', sql.DateTime, new Date())
                        .query('UPDATE TOP (@sales_lines_per_page) ' + SALES_LINES_TABLE + ' SET STOCKUPTRANSFER = @transfer_success_state, STOCKUPTRANSFERTIME = @transfer_time WHERE STOCKUPTRANSFER = @transfer_pending_state ')
                }
            })
            .catch(function (error) {
                logger.error({
                    message: 'Could not delete sales lines from MSSQL, will go on to fetch next batch',
                    error,
                    commandName
                });
                return Promise.resolve('Could not delete sales lines from MSSQL, will go on to fetch next batch');
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
                return fetchPaginatedSalesLines(sqlPool, orgModelId, pagesToFetch);
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
