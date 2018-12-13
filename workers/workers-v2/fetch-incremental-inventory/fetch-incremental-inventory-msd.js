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
const INVENTORY_DIM_TABLE = 'HSInventDimStaging';
const INVENTORY_SUM_TABLE = 'HSInventSumStaging';
const INVENTORY_PER_PAGE = 1000;
const commandName = path.basename(__filename, '.js'); // gives the filename without the .js extension
const maxBatchSize = 1000;

var runMe = function (sqlPool, orgModelId, inventorySyncModel) {
    try {
        // Global variable for logging

        logger.debug({
            commandName: commandName,
            argv: process.argv,
            env: process.env,
            orgModelId,
            inventorySyncModel
        });

        try {
            logger.debug({
                commandName: commandName,
                message: 'This worker will fetch and save incremental inventory from MSD to warehouse'
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
                    var pagesToFetch = Math.ceil(inventorySyncModel.rowCount / INVENTORY_PER_PAGE);
                    logger.debug({
                        message: 'Found the count of total inventory to insert/update',
                        count: inventorySyncModel.rowCount,
                        pagesToFetch
                    });
                    return fetchPaginatedInventory(sqlPool, orgModelId, pagesToFetch, commandName);
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
        logger.error({message: 'last catch block', err: e});
        throw e;
    }
};


module.exports = {
    run: runMe
};

function fetchPaginatedInventory(sqlPool, orgModelId, pagesToFetch) {
    var incrementalInventory;
    if (pagesToFetch>0) {
        return sqlPool.request()
            .input('inventory_per_page', sql.Int, INVENTORY_PER_PAGE)
            .query('SELECT TOP (@inventory_per_page) * FROM ' + INVENTORY_DIM_TABLE + ' as InDIM JOIN ' + INVENTORY_SUM_TABLE + ' as InSum on InDim.InventDimId = InSum.InventDimId')
            .then(function (result) {
                incrementalInventory = result.recordset;
                logger.debug({
                    message: 'Fetched inventory',
                    pagesToFetch,
                    numberOfInventory: incrementalInventory.length,
                    commandName
                });
                var incrementalItemIDs = _.pluck(incrementalInventory, 'ITEMID');
                //Fetch all productModels and storeModels for this inventory
                return Promise.all([
                    db.collection('ProductModel').find({
                        "orgModelId": ObjectId(orgModelId),
                        "api_id": {
                            $in: incrementalItemIDs
                        }
                    }).toArray(),
                    db.collection('StoreModel').find({
                        "orgModelId": ObjectId(orgModelId)
                    }).toArray()
                ]);
            })
            .then(function (result) {
                var productModelInstances = result[0];
                var storeModelInstances = result[1];
                logger.debug({
                    commandName: commandName,
                    message: `Found ${productModelInstances.length} product model instances`
                });
                logger.debug({
                    commandName: commandName,
                    message: `Found ${storeModelInstances.length} store model instances`
                });
                logger.debug({
                    commandName: commandName,
                    message: 'Will attach stores and products to inventory'
                });
                //Initialize the array of unordered batches
                var batch = db.collection('InventoryModel').initializeUnorderedBulkOp();
                var batchCounter = 0, inventoryCounter = 0;
                //Add some operations to be executed
                _.each(incrementalInventory, function (eachInventory, iteratee) {
                    var productModelToAttach = _.findWhere(productModelInstances, {api_id: eachInventory.ITEMID});
                    var storeModelToAttach = _.findWhere(storeModelInstances, {storeNumber: eachInventory.INVENTSITEID});
                    batch.find({
                        inventoryDimId: eachInventory.INVENTDIMID
                    }).upsert().updateOne({
                        $set: {
                            inventoryDimId: eachInventory.INVENTDIMID,
                            productModelId: productModelToAttach ? productModelToAttach._id : null,
                            storeModelId: storeModelToAttach ? storeModelToAttach._id : null,
                            product_id: eachInventory.ITEMID,
                            outlet_id: eachInventory.INVENTSITEID,
                            inventory_level: eachInventory.AVAILPHYSICAL,
                            orgModelId: ObjectId(orgModelId)
                        }
                    });
                    process.stdout.write('\033[0G');
                    process.stdout.write('Percentage completed: ' + Math.round((iteratee++ / incrementalInventory.length) * 100) + '%');
                    inventoryCounter++;
                });
                logger.debug({
                    commandName: commandName,
                    message: `Batch of inventory ready`,
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
                    }
                });
                logger.debug({
                    message: 'Will delete the inserted/updated inventory from Azure SQL'
                });
                return Promise.all([
                    sqlPool.request()
                    .input('inventory_per_page', sql.Int, INVENTORY_PER_PAGE)
                    .query('DELETE TOP (@inventory_per_page) '+INVENTORY_DIM_TABLE+' FROM ' + INVENTORY_DIM_TABLE + ' as InDIM JOIN ' + INVENTORY_SUM_TABLE + ' as InSum on InDim.InventDimId = InSum.InventDimId'),
                    sqlPool.request()
                    .input('inventory_per_page', sql.Int, INVENTORY_PER_PAGE)
                    .query('DELETE TOP (@inventory_per_page) '+INVENTORY_SUM_TABLE+' FROM ' + INVENTORY_DIM_TABLE + ' as InDIM JOIN ' + INVENTORY_SUM_TABLE + ' as InSum on InDim.InventDimId = InSum.InventDimId')
                ]);
            })
            .then(function (result) {
                logger.debug({
                    message: 'Deleted selected inventory from Azure SQL',
                    result
                });
                logger.debug({
                    message: 'Will go on to fetch the next page',
                    pagesToFetch
                });
                pagesToFetch--;
                return fetchPaginatedInventory(sqlPool, orgModelId, pagesToFetch);
            });
    }
    else {
        logger.debug({
            message: 'Executed all pages',
            pagesToFetch
        });
        return Promise.resolve('Executed all pages: ' + pagesToFetch);
    }
}

/**
 * Execute in chunks of 1,000 because that's the max for
 * initializeUnorderedBulkOp()
 * @param batchesArray
 * @param index
 * @return {Promise.<T>}
 */
function executeBatches(batchesArray, index) {
    return new Promise(function (resolve, reject) {
        logger.debug({
            message: `Executing batch ${index + 1}`,
            commandName: commandName
        });
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
