const path = require('path');
const commandName = path.basename(__filename, '.js'); // gives the filename without the .js extension
const logger = require('sp-json-logger')({fileName: 'workers:workers-v2:' + commandName});
var MongoClient = require('mongodb').MongoClient;
var ObjectId = require('mongodb').ObjectID;
var _ = require('underscore');
var Promise = require('bluebird');
var dbUrl = process.env.DB_URL;
var utils = require('./../../jobs/utils/utils.js');
var vendSdk = require('vend-nodejs-sdk')({}); //why the {}?
var suppliersBatchNumber;
var maxBatchSize = 1000;

var runMe = function (vendConnectionInfo, orgModelId, versionsAfter) {

    var db = null; //database connected
    logger.debug({
        orgModelId,
        message: 'This worker will fetch and save incremental suppliers from vend to warehouse'
    });
    return MongoClient.connect(dbUrl, {promiseLibrary: Promise})
        .then(function (dbInstance) {
            db = dbInstance;
            logger.debug({
                orgModelId,
                message: 'Connected to mongodb database',
            });
            suppliersBatchNumber = 0;
            return fetchSuppliersRecursively(dbInstance, vendConnectionInfo, orgModelId, versionsAfter);
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
        });
};

module.exports = {
    run: runMe
};

function assignVirtualStores(newSuppliers, suppliersToDelete, orgModelId, db) {
    logger.debug({
        message: 'Will create virtual stores for new suppliers and delete for deleted suppliers',
        orgModelId,
        newSuppliers,
        suppliersToDelete,
        functionName: 'assignVirtualStores'
    });
    return Promise.all([
        db.collection('SupplierModel').find({
            orgModelId: ObjectId(orgModelId),
            api_id: {
                $in: _.pluck(newSuppliers, 'id')
            }
        }).toArray(),
        db.collection('SupplierModel').find({
            orgModelId: ObjectId(orgModelId),
            api_id: {
                $in: _.pluck(suppliersToDelete, 'id')
            }
        }).toArray(),
    ])
        .catch(function (error) {
            logger.error({
                orgModelId,
                message: 'Could not find new supplier instances in db',
                error,
                functionName: 'assignVirtualStores'
            });
            return Promise.reject('Could not find new supplier instances in db');
        })
        .spread(function (newSuppliers, deletedSuppliers) {
            logger.debug({
                orgModelId,
                message: 'Found supplier model instances in db',
                newSuppliers,
                deletedSuppliers,
                functionName: 'assignVirtualStores'
            });
            var batch = db.collection('StoreModel').initializeUnorderedBulkOp();
            //Add some operations to be executed
            _.each(newSuppliers, function (eachSupplier) {
                batch.find({
                    orgModelId: ObjectId(orgModelId),
                    ownerSupplierModelId: ObjectId(eachSupplier._id)
                }).upsert().updateOne({
                    $set: {
                        name: eachSupplier.name,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        orgModelId: ObjectId(orgModelId),
                        storeNumber: 'Virtual Store',
                        ownerSupplierModelId: ObjectId(eachSupplier._id)
                    }
                });
            });
            _.each(deletedSuppliers, function (eachSupplier) {
                batch.find({
                    orgModelId: orgModelId,
                    ownerSupplierModelId: ObjectId(eachSupplier._id)
                }).remove({
                    ownerSupplierModelId: ObjectId(eachSupplier._id)
                });
            });
            //Execute the operations
            return executeBatch(batch, orgModelId);
        })
        .catch(function (error) {
            logger.error({
                message: 'Could not create virtual stores for new suppliers',
                error
            });
            return Promise.reject('Could not create virtual stores for new suppliers');
        })
        .then(function () {
            logger.debug({
                message: 'Assigned virtual stores to new suppliers and deleted stores for deleted suppliers',
                orgModelId,
                suppliersBatchNumber,
                functionName: 'assignVirtualStores'
            });
            return Promise.resolve('Assigned virtual stores to new suppliers and deleted stores for deleted suppliers');
        });
}

function fetchSuppliersRecursively(dbInstance, vendConnectionInfo, orgModelId, versionsAfter) {
    suppliersBatchNumber++;
    var argsForSuppliers = vendSdk.args.suppliers.fetch();
    argsForSuppliers.after.value = versionsAfter;
    argsForSuppliers.deleted.value = 1; //fetch all deleted suppliers also
    argsForSuppliers.pageSize.value = maxBatchSize;
    return vendSdk.suppliers.fetch(argsForSuppliers, vendConnectionInfo)
        .catch(function (error) {
            logger.error({
                message: 'Could not fetch suppliers from Vend',
                orgModelId,
                suppliersBatchNumber,
                error,
                functionName: 'fetchSuppliersRecursively'
            });
            return Promise.reject('Could not fetch suppliers from Vend');
        })
        .then(function (response) {
            if (response && response.data && response.data.length) {
                logger.debug({
                    message: 'Fetched suppliers data from vend, will save to DB',
                    suppliersCount: response.data.length,
                    orgModelId,
                    suppliersBatchNumber,
                    functionName: 'fetchSuppliersRecursively'
                });
                return saveSuppliers(dbInstance, vendConnectionInfo, orgModelId, response);
            }
            else if (response && response.data && !response.data.length) {
                logger.debug({
                    message: 'No more suppliers to fetch, will exit worker',
                    orgModelId,
                    suppliersBatchNumber,
                    functionName: 'fetchSuppliersRecursively'
                });
                return Promise.resolve('noIncrementalSuppliers');
            }
            else {
                logger.debug({
                    message: 'Vend API returning null response',
                    response,
                    suppliersBatchNumber,
                    orgModelId,
                    functionName: 'fetchSuppliersRecursively'
                });
                return Promise.reject();
            }
        });
}

function saveSuppliers(dbInstance, vendConnectionInfo, orgModelId, suppliers) {
    var suppliersToDelete = _.filter(suppliers.data, function (eachSupplier) {
        return eachSupplier.deleted_at !== undefined && eachSupplier.deleted_at !== null;
    });
    var suppliersToSave = _.difference(suppliers.data, suppliersToDelete);
    logger.debug({
        message: `Found deleted and incremental suppliers`,
        orgModelId,
        suppliersBatchNumber,
        suppliersToSave: suppliersToSave.length,
        suppliersToDelete: suppliersToDelete.length,
        functionName: 'saveSuppliers'
    });
    //Initialize the unordered batch
    var batch = dbInstance.collection('SupplierModel').initializeUnorderedBulkOp();
    //Add some operations to be executed
    _.each(suppliersToSave, function (eachSupplier) {
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
            orgModelId: ObjectId(orgModelId),
            api_id: eachSupplier.id
        }).remove({
            api_id: eachSupplier.id
        })
    });

    //Execute the operations
    return executeBatch(batch, orgModelId)
        .catch(function (error) {
            logger.error({
                message: 'Could not execute batch operation, will exit',
                error,
                suppliersBatchNumber,
                functionName: 'saveSuppliers',
                orgModelId
            });
            return Promise.reject();
        })
        .then(function () {
            logger.debug({
                message: 'Successfully executed batch of Suppliers, will update version number in DB',
                orgModelId,
                suppliersBatchNumber,
                functionName: 'saveSuppliers'
            });
            return dbInstance.collection('SyncModel').updateOne({
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
                        'version': suppliers.version.max
                    }
                });
        })
        .catch(function (error) {
            logger.error({
                message: 'Could not update version number in DB, will stop sync',
                error,
                orgModelId,
                suppliersBatchNumber,
                functionName: 'saveSuppliers'
            });
            return Promise.reject('Could not update version number in DB, will stop sync');
        })
        .then(function () {
            logger.debug({
                message: 'Will create/delete virtual stores for suppliers',
                suppliersBatchNumber,
                functionName: 'saveSuppliers',
                orgModelId,
            });
            return assignVirtualStores(suppliersToSave, suppliersToDelete, orgModelId, dbInstance);
        })
        .then(function () {
            logger.debug({
                message: 'Created/deleted virtual stores for suppliers successfully, will fetch another batch',
                suppliersBatchNumber,
                functionName: 'saveSuppliers',
                orgModelId
            });
            return fetchSuppliersRecursively(dbInstance, vendConnectionInfo, orgModelId, suppliers.version.max);
        });
}

function executeBatch(batch, orgModelId) {
    return new Promise(function (resolve, reject) {
        logger.debug({
            orgModelId,
            message: `Executing batch of suppliers`,
            suppliersBatchNumber,
            functionName: 'executeBatch'
        });
        if (batch.s && batch.s.currentBatch && batch.s.currentBatch.operations) {
            batch.execute(function (err, result) {
                if (err) {
                    logger.error({
                        orgModelId,
                        message: `ERROR in batch`,
                        suppliersBatchNumber,
                        err: err,
                        functionName: 'executeBatch'
                    });
                    reject(err);
                }
                else {
                    logger.debug({
                        orgModelId,
                        message: `Successfully executed batch operation`,
                        suppliersBatchNumber,
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
                suppliersBatchNumber,
                message: `Skipping empty batch`,
                functionName: 'executeBatch'
            });
            resolve('Skipped');
        }
    });
}
