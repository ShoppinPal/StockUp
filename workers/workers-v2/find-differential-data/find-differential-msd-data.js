// Global variable for logging
const path = require('path');
const commandName = path.basename(__filename, '.js'); // gives the filename without the .js extension
const logger = require('sp-json-logger')({fileName: 'common:models:' + commandName});
var dbUrl = process.env.DB_URL;
var Promise = require('bluebird');
var db = null; //database connected
var ObjectId = require('mongodb').ObjectID;
var _ = require('underscore');
const sql = require('mssql');
var utils = require('./../../jobs/utils/utils.js');
var MongoClient = require('mongodb').MongoClient;
var sqlPool = null;


var runMe = function (orgModelId, syncModels) {

    try {
        logger.debug({
            commandName: commandName,
            syncModels,
            orgModelId,
            argv: process.argv,
            env: process.env
        });

        try {
            // process.env['User-Agent'] = taskId + ':' + messageId + ':' + commandName + ':' + payload.domainPrefix;
            logger.debug({
                commandName: commandName,
                message: 'This worker will look for any incremental MSD Data',
                syncModels: syncModels,
                orgModelId
            });
            return Promise.resolve()
                .then(function () {
                    logger.debug({
                        message: 'Will connect to Mongo DB',
                        commandName,
                        orgModelId
                    });
                    return MongoClient.connect(dbUrl, {promiseLibrary: Promise});
                })
                .catch(function (error) {
                    logger.error({
                        message: 'Could not connect to Mongo DB',
                        error,
                        orgModelId
                    });
                    return Promise.reject('Could not connect to Mongo DB');
                })
                .then(function (dbInstance) {
                    db = dbInstance;
                    logger.debug({
                        message: 'Connected to Mongo DB, will look for organisations\'s integration model for MSSQL DB',
                        orgModelId
                    });
                    return db.collection('IntegrationModel').findOne({
                        orgModelId: ObjectId(orgModelId)
                    });
                })
                .catch(function (error) {
                    logger.error({
                        message: 'Could not find organisation\'s integration model',
                        error,
                        orgModelId
                    });
                    return Promise.reject('Could not find organisation\'s integration model');
                })
                .then(function (integrationModel) {
                    if(!integrationModel || !integrationModel.databaseName || !integrationModel.databaseValid) {
                        logger.error({
                            message: 'Could not fetch SQL server details for org',
                            orgModelId,
                            integrationModel
                        });
                        return Promise.reject('Could not fetch SQL server details for org');
                    }
                    const sqlConfig = {
                        user: process.env.AZURE_SQL_USER,
                        password: process.env.AZURE_SQL_PASSWORD,
                        server: process.env.AZURE_SQL_SERVER, // You can use 'localhost\\instance' to connect to named instance
                        database: integrationModel.databaseName,
                        connectionTimeout: 120000,
                        requestTimeout: 120000,
                        options: {
                            encrypt: true // Use this if you're on Windows Azure
                        }
                    };
                    logger.debug({
                        message: 'Found Organisation\'s integration details, Connecting to MS SQL on Azure',
                        commandName,
                        orgModelId,
                        integrationModel
                    });
                    return sql.connect(sqlConfig);
                })
                .catch(function (error) {
                    logger.error({
                        message: 'Could not connect to MS SQL on Azure',
                        error,
                        commandName,
                        orgModelId
                    });
                    return Promise.reject('Could not connect to MS SQL on Azure');
                })
                .then(function (pool) {
                    logger.debug({
                        message: 'Connected to MS SQL on Azure',
                        commandName,
                        orgModelId
                    });
                    sqlPool = pool;
                    logger.debug({
                        message: 'Will look for tables with their row counts',
                        commandName,
                        orgModelId
                    });
                    return sqlPool.request()
                        .query('SELECT SCHEMA_NAME(schema_id) AS [SchemaName], ' +
                            '[Tables].name AS [TableName], ' +
                            'SUM([Partitions].[rows]) AS [TotalRowCount] ' +
                            'FROM sys.tables AS [Tables] ' +
                            'JOIN sys.partitions AS [Partitions] ' +
                            'ON [Tables].[object_id] = [Partitions].[object_id] ' +
                            'AND [Partitions].index_id IN ( 0, 1 ) ' +
                            'GROUP BY SCHEMA_NAME(schema_id), [Tables].name;');
                })
                .then(function (tableRows) {
                    logger.debug({
                        message: 'Found the following tables with their row counts',
                        tableRows,
                        commandName,
                        orgModelId
                    });
                    tableRows = tableRows.recordsets[0];

                    /**
                     * Logic to find which data object versions have changed since
                     * the last sync, only those data objects will be fetched by
                     * calling their corresponding fetch-workers
                     */
                    var incrementalSyncModels = [];
                    for (var i = 0; i<tableRows.length; i++) {
                        if (tableRows[i].TotalRowCount>0) {
                            for (var j = 0; j<syncModels.length; j++) {
                                if (syncModels[j].tableName === tableRows[i].TableName) {
                                    syncModels[j].rowCount = tableRows[i].TotalRowCount;
                                    incrementalSyncModels.push(syncModels[j]);
                                }
                            }
                        }
                    }
                    logger.debug({
                        commandName: commandName,
                        message: 'Some data objects differ in versions, will go on to fetch the required ones',
                        incrementalSyncModels,
                        orgModelId
                    });

                    if (incrementalSyncModels.length>0) {
                        return callFetchDataObjectsWorker(sqlPool, orgModelId, incrementalSyncModels);
                    }
                    else {
                        logger.debug({
                            commandName: commandName,
                            message: 'MSD data objects are up-to-date in warehouse, ending worker'
                        });
                        return Promise.reject('noIncrementalData');
                    }
                })
                .then(function (response) {
                    logger.debug({
                        commandName: commandName,
                        message: 'Finished calling the required worker, will exit now',
                        orgModelId
                    });
                    return Promise.resolve();
                })
                .catch(function (error) {
                    if (error === 'noIncrementalData') {
                        return db.collection('SyncModel').updateMany({
                            orgModelId: ObjectId(orgModelId),
                        }, {
                            $set: {
                                syncInProcess: false,
                                workerTaskId: '',
                                lastSyncedAt: new Date()
                            }
                        });
                    }
                    else if (error === 'syncStatusSetToFalse') {
                        return Promise.resolve();
                    }
                    else {
                        logger.error({
                            commandName: commandName,
                            message: 'Could not fetch data',
                            err: error,
                            orgModelId
                        });
                        return Promise.reject(error);
                    }
                })
                .then(function (response) {
                    logger.debug({
                        commandName: commandName,
                        message: 'Everything is already in sync, updated sync models info',
                        result: response ? response.result || response : '',
                        orgModelId
                    });
                    return Promise.resolve()
                })
                .finally(function () {
                    logger.debug({
                        commandName: commandName,
                        message: 'Closing Mongo database connection',
                        orgModelId
                    });
                    if (db) {
                        return db.close();
                    }
                    return Promise.resolve();
                })
                .finally(function () {
                    logger.debug({
                        commandName: commandName,
                        message: 'Closing SQL database connection',
                        orgModelId
                    });
                    if (sql) {
                        return sqlPool.close();
                    }
                    return Promise.resolve();
                })
                .catch(function (error) {
                    logger.error({
                        commandName: commandName,
                        message: 'Could not close db connection',
                        error,
                        orgModelId
                    });
                    return Promise.resolve();
                    //TODO: set a timeout, after which close all listeners
                });
        }
        catch (e) {
            logger.error({commandName: commandName, message: '2nd last catch block', err: e, orgModelId});
            throw e;
        }
    }
    catch (e) {
        logger.error({commandName: commandName, message: 'last catch block', err: e, orgModelId});
        throw e;
    }
};

var callFetchDataObjectsWorker = function (sqlPool, orgModelId, syncModels) {
    logger.debug({commandName: commandName, message: 'inside callFetchDataObjectsWorker()', orgModelId});
    if (syncModels instanceof Array && syncModels.length>0) {
        var dataObjectNames = _.pluck(syncModels, 'name');
        var dataObjectIndices = {
            suppliers: dataObjectNames.indexOf('suppliers'),
            products: dataObjectNames.indexOf('products'),
            productCategories: dataObjectNames.indexOf('productCategories'),
            inventoryDims: dataObjectNames.indexOf('inventoryDims'),
            inventorySums: dataObjectNames.indexOf('inventorySums'),
            sales: dataObjectNames.indexOf('sales'),
            salesLines: dataObjectNames.indexOf('salesLines')
        };
        /**
         * Do not hamper the order here, it has been put in this way because:
         * 1) Supplier is not dependent on anything, so it goes first
         * 2) Product is dependent on suppliers, so it needs suppliers
         * 3) Inventory is dependent on products, so it needs products
         * 4) Sales is dependent on inventory, so it needs inventory
         */
        return Promise.resolve()
            .then(function () {
                if (dataObjectIndices.suppliers !== -1) {
                    logger.debug({
                        commandName: commandName,
                        message: 'Calling fetch suppliers worker',
                        orgModelId
                    });
                    var fetchIncrementalSuppliers = require('./../fetch-incremental-suppliers/fetch-incremental-suppliers-msd');
                    return fetchIncrementalSuppliers.run(orgModelId, syncModels[dataObjectIndices.suppliers]);
                }
                else {
                    return Promise.resolve();
                }
            })
            .then(function () {
                if (dataObjectIndices.products !== -1) {
                    logger.debug({
                        commandName: commandName,
                        message: 'Calling fetch products worker',
                        orgModelId
                    });
                    var fetchIncrementalProducts = require('./../fetch-incremental-products/fetch-incremental-products-msd');
                    return fetchIncrementalProducts.run(sqlPool, orgModelId, syncModels[dataObjectIndices.products]);
                }
                else {
                    return Promise.resolve();
                }
            })
            .then(function () {
                if (dataObjectIndices.productCategories !== -1) {
                    logger.debug({
                        commandName: commandName,
                        message: 'Calling fetch product categories worker',
                        orgModelId
                    });
                    var fetchIncrementalProducts = require('./../fetch-incremental-products/fetch-incremental-products-category-msd');
                    return fetchIncrementalProducts.run(sqlPool, orgModelId, syncModels[dataObjectIndices.productCategories]);
                }
                else {
                    return Promise.resolve();
                }
            })
            .then(function () {
                if (dataObjectIndices.inventorySums !== -1) {
                    logger.debug({
                        commandName: commandName,
                        message: 'Calling fetch inventory worker',
                        orgModelId
                    });
                    var fetchIncrementalInventory = require('./../fetch-incremental-inventory/fetch-incremental-inventorySums-msd');
                    return fetchIncrementalInventory.run(sqlPool, orgModelId, syncModels[dataObjectIndices.inventorySums]);
                }
                else {
                    return Promise.resolve();
                }
            })
            .then(function () {
                if (dataObjectIndices.inventoryDims !== -1) {
                    logger.debug({
                        commandName: commandName,
                        message: 'Calling fetch inventory worker',
                        orgModelId
                    });
                    var fetchIncrementalInventory = require('./../fetch-incremental-inventory/fetch-incremental-inventoryDims-msd');
                    return fetchIncrementalInventory.run(sqlPool, orgModelId, syncModels[dataObjectIndices.inventoryDims]);
                }
                else {
                    return Promise.resolve();
                }
            })
            .then(function () {
                if (dataObjectIndices.sales !== -1) {
                    logger.debug({
                        commandName: commandName,
                        message: 'Calling fetch sales worker',
                        orgModelId
                    });
                    var fetchIncrementalSales = require('./../fetch-incremental-sales/fetch-incremental-sales-msd');
                    return fetchIncrementalSales.run(sqlPool, orgModelId, syncModels[dataObjectIndices.sales]);
                }
                else {
                    return Promise.resolve();
                }
            })
            .then(function () {
                if (dataObjectIndices.salesLines !== -1) {
                    logger.debug({
                        commandName: commandName,
                        message: 'Calling fetch sales lines worker',
                        orgModelId
                    });
                    var fetchIncrementalSales = require('./../fetch-incremental-sales/fetch-incremental-sales-lines-msd');
                    return fetchIncrementalSales.run(sqlPool, orgModelId, syncModels[dataObjectIndices.salesLines]);
                }
                else {
                    return Promise.resolve();
                }
            })

            .then(function () {
                logger.debug({
                    commandName: commandName,
                    message: 'Will remove the sync models from database that aren\'t supported yet',
                    orgModelId
                });
                return Promise.map(syncModels, function (eachSyncModel) {
                    if (_.keys(dataObjectIndices).indexOf(eachSyncModel.name) === -1) {
                        logger.debug({
                            commandName: commandName,
                            message: `Removing ${eachSyncModel.name}`,
                            orgModelId
                        });
                        return db.collection('SyncModel').deleteOne({
                            $and: [
                                {
                                    name: eachSyncModel.name,
                                },
                                {
                                    orgModelId: ObjectId(orgModelId)
                                }
                            ],
                        });
                    }
                    else {
                        return Promise.resolve();
                    }
                });
            })
            .then(function (response) {
                logger.debug({
                    commandName: commandName,
                    message: 'Deleted the sync models that are not supported yet',
                    result: response.result,
                    orgModelId
                });
                return Promise.resolve();
            })
            .catch(function (error) {
                logger.error({
                    commandName: commandName,
                    message: 'Something went wrong while calling workers',
                    err: error,
                    orgModelId
                });
                return Promise.reject(error);
            });
    }
};

module.exports = {
    run: runMe
};
