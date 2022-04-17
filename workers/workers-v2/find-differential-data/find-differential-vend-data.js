const path = require('path');
const commandName = path.basename(__filename, '.js'); // gives the filename without the .js extension
const logger = require('sp-json-logger')({fileName: 'workers:workers-v2:' + commandName});
var Promise = require('bluebird');
var db = null; //database connected
var ObjectId = require('mongodb').ObjectID;
var _ = require('underscore');
var utils = require('./../../jobs/utils/utils.js');
var MongoClient = require('mongodb').MongoClient;
// Global variable for logging
var dbUrl = process.env.DB_URL;
var vendConnectionInfo;

var runMe = function (orgModelId, syncModels) {

    try {

        try {
            // process.env['User-Agent'] = taskId + ':' + messageId + ':' + commandName + ':' + payload.domainPrefix;
            logger.debug({
                orgModelId,
                message: 'This worker will look for any incremental Vend data',
            });
            return Promise.resolve()
                .then(function () {
                    logger.debug({
                        orgModelId,
                        message: 'Will connect to Mongo DB'
                    });
                    return MongoClient.connect(dbUrl, {promiseLibrary: Promise});
                })
                .catch(function (error) {
                    logger.error({
                        orgModelId,
                        message: 'Could not connect to Mongo DB',
                        error
                    });
                    return Promise.reject('Could not connect to Mongo DB');
                })
                .then(function (dbInstance) {
                    db = dbInstance;

                    logger.debug({
                        orgModelId,
                        message: 'Connected to Mongo DB, will look fetch access token to connect to Vend',
                    });
                    return utils.fetchVendToken(db, orgModelId);
                })
                .catch(function (error) {
                    logger.error({
                        message: 'Could not fetch vend token',
                        error,
                        orgModelId
                    });
                    return Promise.reject('Could not fetch vend token');
                })
                .then(function (token) {
                    logger.debug({
                        message: 'Fetched new vend token, will look for organisation\'s integration model',
                        orgModelId
                    });
                    return db.collection('IntegrationModel').findOne({
                        orgModelId: ObjectId(orgModelId)
                    });
                })
                .catch(function (error) {
                    logger.error({
                        orgModelId,
                        message: 'Could not find organisation\'s integration model',
                        error,
                    });
                    return Promise.reject('Could not find organisation\'s integration model');
                })
                .then(function (integrationModelInstance) {
                    if (!integrationModelInstance || !integrationModelInstance.domain_prefix) {
                        logger.error({
                            orgModelId,
                            message: 'Could not fetch Vend config for org',
                            integrationModelInstance
                        });
                        return Promise.reject('Could not fetch Vend config for org');
                    }
                    logger.debug({
                        orgModelId,
                        message: 'Found integration model, Will fetch versions of entities from Vend',
                        integrationModelInstance
                    });
                    vendConnectionInfo = {
                        accessToken: integrationModelInstance.access_token,
                        tokenType: integrationModelInstance.token_type,
                        refreshToken: integrationModelInstance.refresh_token,
                        domainPrefix: integrationModelInstance.domain_prefix
                    };
                    return callFetchDataObjectsWorker(syncModels, orgModelId);

                })
                .then(function (response) {
                    logger.debug({
                        orgModelId,
                        commandName: commandName,
                        message: 'Finished calling the required worker, will exit now'
                    });
                    return Promise.resolve();
                })
                .catch(function (error) {
                    logger.error({
                        orgModelId,
                        message: 'Could not fetch data',
                        err: error
                    });
                    return Promise.reject(error);
                    // }
                })
                .finally(function () {
                    logger.debug({
                        orgModelId,
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
                        orgModelId,
                        commandName: commandName,
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

var callFetchDataObjectsWorker = function (syncModels, orgModelId) {
    logger.debug({orgModelId, message: 'inside callFetchDataObjectsWorker()'});
    if (syncModels instanceof Array && syncModels.length>0) {
        var dataObjectNames = _.pluck(syncModels, 'name');
        var dataObjectIndices = {
            suppliers: dataObjectNames.indexOf('suppliers'),
            products: dataObjectNames.indexOf('products'),
            inventory: dataObjectNames.indexOf('inventory'),
            sales: dataObjectNames.indexOf('sales'),
            product_types : dataObjectNames.indexOf('product_types')
        };
        /**
         * Do not hamper the order here, it has been put in this way because:
         * 1) Supplier is not dependent on anything, so it goes first
         * 2) Product is dependent on suppliers, so it needs suppliers
         * 3) Inventory is dependent on products, so it needs products
         */
        return Promise.resolve()
            .then(function () {
                if (dataObjectIndices.suppliers !== -1) {
                    logger.debug({
                        orgModelId,
                        message: 'Calling fetch suppliers worker'
                    });
                    var fetchIncrementalSuppliers = require('./../fetch-incremental-suppliers/fetch-incremental-suppliers');
                    return fetchIncrementalSuppliers.run(vendConnectionInfo, orgModelId, syncModels[dataObjectIndices.suppliers].version);
                }
                else {
                    return Promise.resolve();
                }
            })
            .then(function(){
                if(dataObjectIndices.product_types !== -1){
                    logger.debug({
                        orgModelId,
                        message: 'Calling fetch product category worker',
                    })

                    var fetchIncrementalCategory = require('./../fetch-incremental-category/fetch-incremental-category');
                    return fetchIncrementalCategory.run(vendConnectionInfo,orgModelId, syncModels[dataObjectIndices.product_types].version);
                }
                else{
                    return Promise.resolve();
                }
            })
            .then(function () {
                if (dataObjectIndices.products !== -1) {
                    logger.debug({
                        orgModelId,
                        message: 'Calling fetch products worker'
                    });
                    var fetchIncrementalProducts = require('./../fetch-incremental-products/fetch-incremental-products');
                    return fetchIncrementalProducts.run(vendConnectionInfo, orgModelId, syncModels[dataObjectIndices.products].version);
                }
                else {
                    return Promise.resolve();
                }
            })
            .then(function () {
                if (dataObjectIndices.inventory !== -1) {
                    logger.debug({
                        orgModelId,
                        message: 'Calling fetch inventory worker'
                    });
                    var fetchIncrementalInventory = require('./../fetch-incremental-inventory/fetch-incremental-inventory');
                    return fetchIncrementalInventory.run(vendConnectionInfo, orgModelId, syncModels[dataObjectIndices.inventory].version);
                }
                else {
                    return Promise.resolve();
                }
            })
            .then(function () {
                if (dataObjectIndices.sales !== -1) {
                    logger.debug({
                        orgModelId,
                        message: 'Calling fetch sales worker'
                    });
                    var fetchIncrementalSales = require('./../fetch-incremental-sales/fetch-incremental-sales');
                    return fetchIncrementalSales.run(vendConnectionInfo, orgModelId, syncModels[dataObjectIndices.sales].version);
                }
                else {
                    return Promise.resolve();
                }
            })
            .then(function () {
                logger.debug({
                    orgModelId,
                    commandName: commandName,
                    message: 'Will remove the sync models from database that aren\'t supported yet'
                });
                return Promise.map(syncModels, function (eachDataObject) {
                    if (_.keys(dataObjectIndices).indexOf(eachDataObject.name) === -1) {
                        logger.debug({
                            orgModelId,
                            message: `Removing ${eachDataObject.name}`
                        });
                        return db.collection('SyncModel').deleteOne({
                            $and: [
                                {
                                    name: eachDataObject.name,
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
                    orgModelId,
                    message: 'Deleted the sync models that are not supported yet',
                    result: response.result
                });
                return Promise.resolve();
            })
            .catch(function (error) {
                logger.error({
                    orgModelId,
                    message: 'Something went wrong while calling workers',
                    err: error
                });
                return Promise.reject(error);
            });
    }
};

module.exports = {
    run: runMe
};
