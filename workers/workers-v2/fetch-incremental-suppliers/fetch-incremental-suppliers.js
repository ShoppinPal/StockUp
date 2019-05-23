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
        var vendSdk = require('vend-nodejs-sdk')({}); //why the {}?
        // var vendConnectionInfo;
        var db = null; //database connected
        var incrementalSuppliers, suppliersToDelete;

        try {
            // process.env['User-Agent'] = taskId + ':' + messageId + ':' + commandName + ':' + payload.domainPrefix;
            logger.debug({
                message: 'This worker will fetch and save incremental suppliers from vend to warehouse'
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
                     logger.debug({messageId: messageId, commandName: commandName, nconf: nconf.get()});
                     vendConnectionInfo = utils.loadOauthTokens();
                     */
                    var argsForSuppliers = vendSdk.args.suppliers.fetch();
                    argsForSuppliers.after.value = dataObject.versionsAfter;
                    argsForSuppliers.deleted.value = 1; //fetch all deleted suppliers also
                    return vendSdk.suppliers.fetch(argsForSuppliers, vendConnectionInfo);
                })
                .then(function (fetchedSuppliers) {
                    if (!fetchedSuppliers.data.length) {
                        return Promise.reject('noIncrementalSuppliers');
                    }
                    suppliersToDelete = _.filter(fetchedSuppliers.data, function (eachSupplier) {
                        return eachSupplier.deleted_at !== undefined && eachSupplier.deleted_at !== null;
                    });
                    incrementalSuppliers = _.difference(fetchedSuppliers.data, suppliersToDelete);
                    logger.debug({
                        message: `Found ${suppliersToDelete.length} deleted suppliers, will delete them from the database`
                    });
                    logger.debug({
                        message: `Found ${incrementalSuppliers.length} new suppliers, will filter only required data from them`
                    });
                    return MongoClient.connect(dbUrl, {promiseLibrary: Promise});
                })
                .then(function (dbInstance) {
                    logger.debug({
                        message: 'Connected to mongodb database, will download suppliers into database'
                    });
                    db = dbInstance;
                    //Initialize the unordered batch
                    var batch = db.collection('SupplierModel').initializeUnorderedBulkOp();
                    //Add some operations to be executed
                    _.each(incrementalSuppliers, function (eachSupplier) {
                        batch.find({
                            orgModelId: ObjectId(orgModelId),
                            api_id: eachSupplier.id
                        }).upsert().updateOne({
                            $set: {
                                name: eachSupplier.name,
                                api_id: eachSupplier.id,
                                orgModelId: ObjectId(orgModelId),
                                updatedAt: new Date()
                            }
                        });
                    });
                    _.each(suppliersToDelete, function (eachSupplier) {
                        batch.find({
                            orgModelId: orgModelId,
                            api_id: eachSupplier.id
                        }).remove({
                            api_id: eachSupplier.id
                        })
                    });

                    //Execute the operations
                    return batch.execute();
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
                        message: 'Bulk insert operation complete',
                        result: result
                    });
                    logger.debug({
                        message: 'Will go on to update version no. in warehouse'
                    });
                    return db.collection('SyncModel').updateOne({
                            $and: [
                                {
                                    'orgModelId': ObjectId(orgModelId)
                                },
                                {
                                    'name': 'suppliers'
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
                        message: 'Updates suppliers version number in warehouse',
                        result: response ? response.result || response : ''
                    });
                    return Promise.resolve();
                })
                .catch(function (error) {
                    if (error === 'noIncrementalSuppliers') {
                        logger.debug({
                            message: 'No incremental suppliers found, will exit'
                        });
                        // return db.collection('SyncModel').updateOne({
                        //         $and: [
                        //             {
                        //                 'orgModelId': ObjectId(payload.orgModelId)
                        //             },
                        //             {
                        //                 'name': 'suppliers'
                        //             }
                        //         ],
                        //     },
                        //     {
                        //         $set: {
                        //             'syncInProcess': false,
                        //             'workerTaskId': '',
                        //             'lastSyncedAt': new Date()
                        //         }
                        //     });
                        return Promise.resolve();
                    }
                    logger.error({
                        message: 'Could not fetch and save suppliers',
                        err: error
                    });
                    return Promise.reject(error);
                })
                .then(function (response) {
                    logger.debug({
                        message: 'Updated sync model for suppliers',
                        result: response ? response.result || response : ''
                    });
                    return Promise.resolve();
                })
                .finally(function () {
                    logger.debug({
                        message: 'Closing database connection'
                    });
                    if (db) {
                        return db.close();
                    }
                })
                .catch(function (error) {
                    logger.error({
                        message: 'Could not close db connection',
                        err: error
                    });
                    return Promise.resolve();
                    //TODO: set a timeout, after which close all listeners
                });
        }
        catch (e) {
            logger.error({message: '2nd last catch block', err: e});
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
