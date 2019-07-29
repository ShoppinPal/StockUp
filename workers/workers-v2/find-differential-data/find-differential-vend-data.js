const path = require('path');
const commandName = path.basename(__filename, '.js'); // gives the filename without the .js extension
const logger = require('sp-json-logger')({fileName: 'workers:workers-v2:' + commandName});
var Promise = require('bluebird');
var db = null; //database connected
var ObjectId = require('mongodb').ObjectID;
var _ = require('underscore');
var utils = require('./../../jobs/utils/utils.js');
var MongoClient = require('mongodb').MongoClient;
var vendSdk = require('vend-nodejs-sdk')({}); //why the {}?
// Global variable for logging
var dbUrl = process.env.DB_URL;
var vendConnectionInfo;

var runMe = function (orgModelId, syncModels) {

    try {
        var vendNewDataObjectVersions;

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
                .then(function(token) {
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
                    return vendSdk.versions.fetchAll(vendConnectionInfo);
                })
                .catch(function (error) {
                    logger.error({
                        orgModelId,
                        message: 'Could not fetch entity versions from Vend',
                        error
                    });
                    return Promise.reject('Could not fetch entity versions from Vend');
                })
                .then(function (versions) {
                    logger.debug({
                        orgModelId,
                        message: 'Found latest data object versions from vend',
                        versions
                    });
                    vendNewDataObjectVersions = versions.data;
                    logger.debug({
                        orgModelId,
                        message: 'Will look for properties which are set to sync in database',
                    });
                    return db.collection('SyncModel').find({
                        $and: [{
                            orgModelId: ObjectId(orgModelId),

                        },
                            {
                                name: {
                                    $in: _.pluck(syncModels, 'name')
                                }
                            }],
                    }).toArray();
                })
                .then(function (syncModelInstances) {
                    logger.debug({
                        orgModelId,
                        message: 'Found following syncModels',
                        syncModelInstances: syncModelInstances
                    });
                    // payload.vendDataObjects = _.intersection(payload.vendDataObjects, _.pluck(syncModelInstances, 'name'));
                    // logger.debug({orgModelId,
                    //     messageId: messageId,
                    //     commandName: commandName,
                    //     message: 'Not all properties are set to sync yet, will try to sync only',
                    //     vendDataObjects: payload.vendDataObjects
                    // });
                    // if (!payload.vendDataObjects.length || !syncModelInstances.length) {
                    //     logger.debug({orgModelId,
                    //         messageId: messageId,
                    //         commandName: commandName,
                    //         message: 'Nothing to sync, will exit'
                    //     });
                    //     return Promise.reject('syncStatusSetToFalse');
                    // }
                    /**
                     * Logic to find which data object versions have changed since
                     * the last sync, only those data objects will be fetched by
                     * calling their corresponding fetch-workers
                     */
                    var differentialDataObjects = [];
                    _.each(syncModelInstances, function (eachSyncModel) {
                        if (eachSyncModel.version !== undefined && vendNewDataObjectVersions[eachSyncModel.name] !== eachSyncModel.version) {
                            differentialDataObjects.push({
                                name: eachSyncModel.name,
                                versionsAfter: eachSyncModel.version,
                                versionsBefore: vendNewDataObjectVersions[eachSyncModel.name]
                            });
                        }
                    });
                    logger.debug({
                        orgModelId,
                        message: 'Some data objects differ in versions, will go on to fetch the required ones',
                        differentialDataObjects: differentialDataObjects
                    });
                    if (differentialDataObjects.length>0) {
                        return callFetchDataObjectsWorker(differentialDataObjects, orgModelId);
                    }
                    else {
                        logger.debug({
                            orgModelId,
                            commandName: commandName,
                            message: 'Vend data objects are up-to-date in warehouse, ending worker'
                        });
                        return Promise.reject('noDifferenceInDataVersions');
                    }
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
                    if (error === 'noDifferenceInDataVersions') {
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
                    // else if (error === 'syncStatusSetToFalse') {
                    //     return Promise.resolve();
                    // }
                    else {
                        logger.error({
                            orgModelId,
                            message: 'Could not fetch data',
                            err: error
                        });
                        return Promise.reject(error);
                    }
                })
                .then(function (response) {
                    logger.debug({
                        orgModelId,
                        message: 'Everything is already in sync, updated sync models info',
                        result: response ? response.result || response : ''
                    });
                    return Promise.resolve()
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

var callFetchDataObjectsWorker = function (dataObjects, orgModelId) {
    logger.debug({orgModelId, message: 'inside callFetchDataObjectsWorker()'});
    if (dataObjects instanceof Array && dataObjects.length>0) {
        var dataObjectNames = _.pluck(dataObjects, 'name');
        var dataObjectIndices = {
            suppliers: dataObjectNames.indexOf('suppliers'),
            products: dataObjectNames.indexOf('products'),
            inventory: dataObjectNames.indexOf('inventory')
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
                    // var refinedPayload = preparePayloadForWorker(dataObjects[dataObjectIndices.suppliers], payload, messageId);
                    var fetchIncrementalSuppliers = require('./../fetch-incremental-suppliers/fetch-incremental-suppliers');
                    return fetchIncrementalSuppliers.run(vendConnectionInfo, orgModelId, dataObjects[dataObjectIndices.suppliers]);
                }
                else {
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
                    return fetchIncrementalProducts.run(vendConnectionInfo, orgModelId, dataObjects[dataObjectIndices.products]);
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
                    // var refinedPayload = preparePayloadForWorker(dataObjects[dataObjectIndices.inventory], payload, messageId);
                    var fetchIncrementalSuppliers = require('./../fetch-incremental-inventory/fetch-incremental-inventory');
                    return fetchIncrementalSuppliers.run(vendConnectionInfo, orgModelId, dataObjects[dataObjectIndices.inventory]);
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
                return Promise.map(dataObjects, function (eachDataObject) {
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

// var preparePayloadForWorker = function (eachDataObject, payload, messageId) {
//     logger.debug({orgModelId,
//         messageId: messageId,
//         commandName: commandName,
//         message: 'inside preparePayloadForWorker()',
//         eachDataObject: eachDataObject
//     });
//     return {
//         tokenService: payload.tokenService,
//         clientId: payload.clientId,
//         clientSecret: payload.clientSecret,
//         tokenType: payload.tokenType,
//         accessToken: payload.accessToken,
//         refreshToken: payload.refreshToken,
//         domainPrefix: payload.domainPrefix,
//         loopbackServerUrl: payload.loopbackServerUrl,
//         loopbackAccessToken: payload.loopbackAccessToken,
//         versionsAfter: eachDataObject.versionsAfter,
//         versionsBefore: eachDataObject.versionsBefore,
//         orgModelId: payload.orgModelId
//     };
// };

module.exports = {
    run: runMe
};
