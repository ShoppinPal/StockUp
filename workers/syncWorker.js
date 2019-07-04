const path = require('path');
const fileName = path.basename(__filename, '.js'); // gives the filename without the .js extension
const logger = require('sp-json-logger')({fileName: 'common:models:' + fileName});
const MongoClient = require('mongodb').MongoClient;
var ObjectId = require('mongodb').ObjectID;
const dbUrl = process.env.DB_URL;
const Promise = require('bluebird');
var utils = require('./jobs/utils/utils.js');
const rp = require('request-promise');
var retryCount = process.env.WORKER_SYNC_RETRIES;
const retryInterval = process.env.WORKER_SYNC_RETRY_INTERVAL_IN_SECONDS;
var db = null;
const _ = require('underscore');
const SUCCESS = 0;
const FAILURE = 1;
const syncInterval = 300;

logger.debug({
    message: '************ Sync Worker Initiated ************'
});

return MongoClient.connect(dbUrl, {promiseLibrary: Promise})
    .catch(function (error) {
        logger.error({
            error,
            fileName,
            message: 'Could not connect to Mongo DB'
        });
        return Promise.reject(error);
    })
    .then(function (dbInstance) {
        logger.debug({
            fileName,
            message: 'Connected to mongodb database, will look for sync models to sync'
        });
        db = dbInstance;
        return runSyncJobs();
    })
    .then(function (response) {
        logger.debug({
            fileName,
            message: 'Sync job limit reached, will exit',
            response
        });
        process.exit(SUCCESS);
    })
    .catch(function (error) {
        logger.error({
            error,
            fileName,
            message: 'Error in running sync jobs'
        });
        process.exit(FAILURE);
    });

function runSyncJobs() {
    if (retryCount>0) {
        return db.collection('SyncModel').find({
            $and: [
                {
                    $where: "function(){return ((Date.now() - Date.parse(this.lastSyncedAt))/1000 >= " + syncInterval + ")}"
                },
                {
                    syncInProcess: false
                }
            ]
        }).toArray()
            .catch(function (error) {
                logger.error({
                    fileName,
                    message: 'Could not fetch sync models from db',
                    error,
                    retryCount
                });
                return Promise.reject(error);
            })
            .then(function (syncModelInstances) {
                if (syncModelInstances) {
                    logger.debug({
                        fileName,
                        message: 'Found these syncModels',
                        syncModelInstances,
                        retryCount
                    });
                    return routeToWorker(syncModelInstances);
                    //
                    //
                    //
                    //
                    // var batch = db.collection('SyncModel').initializeUnorderedBulkOp();
                    // _.each(syncModelInstances, function (eachSyncModel) {
                    //     batch.find(eachSyncModel).updateOne({
                    //         $set: {
                    //             lastSyncedAt: new Date()
                    //         }
                    //     });
                    // });
                    // return batch.execute();
                }
                else {
                    logger.debug({
                        fileName,
                        message: 'Found no sync models to run, will retry in some time',
                        retryInterval,
                        retryCount
                    });
                    return Promise.resolve('Found no sync models');
                }
            })
            .then(function (response) {
                logger.debug({
                    fileName,
                    message: 'Sync models updated, will run again after some time',
                    response,
                    retryInterval,
                    retryCount
                });
                retryCount--;
                return Promise.delay(retryInterval * 1000);
            })
            .then(function () {
                return runSyncJobs();
            })
            .catch(function (error) {
                logger.error({
                    fileName,
                    message: 'Some error',
                    error,
                    retryCount
                });
            });
    }
    else {
        logger.debug({
            fileName,
            message: 'Max worker retries reached, will shut down and restart',
            retryCount
        });
        return Promise.resolve('Max worker retries reached, will shut down and restart');
    }
}

function routeToWorker(syncModels) {
    var orgSyncModels = _.groupBy(syncModels, function (eachSyncModel) {
        return eachSyncModel.orgModelId;
    });
    logger.debug({
        fileName,
        message: 'Sync models grouped by organisation',
        orgSyncModels
    });
    return Promise.map(Object.keys(orgSyncModels), function (eachOrg) {
        logger.debug({
            message: 'Will update syncInProcess to true for this org',
            eachOrg,
            functionName: 'routeToWorker'
        });
        return db.collection('SyncModel').updateMany({
            orgModelId: ObjectId(eachOrg)
        }, {
            $set: {
                syncInProcess: true
            }
        })
            .catch(function (error) {
                logger.error({
                    message: 'Could not update sync status',
                    error,
                    functionName: 'routeToWorker',
                    eachOrg
                });
            }).then(function (response) {
                var options = {
                    method: 'POST',
                    uri: utils.API_URL + '/api/OrgModels/' + eachOrg + '/notifySyncToAll',
                    json: true,
                    body: {
                        data: {
                            loading: true
                        }
                    }
                };
                logger.debug({
                    message: 'Will Notify Org Users',
                    response,
                    options
                });
                return rp(options);
            })
            .catch(function (error) {
                logger.error({
                    message: 'Could not Notify Users.Will Move On',
                    error,
                    eachOrg,
                    functionName: 'routeToWorker'
                });
                // return Promise.reject('Could not notify users ');
            })
            .then(function (response) {
                logger.debug({
                    message: 'Updated sync models to inProcess',
                    response,
                    organisation: eachOrg
                });
                if (orgSyncModels[eachOrg][0].syncType === 'msd') {
                    logger.debug({
                        message: 'Will find differential MSD data for this org',
                        eachOrg,
                        functionName: 'routeToWorker'
                    });
                    var findDifferentialMSDData = require('./workers-v2/find-differential-data/find-differential-msd-data');
                    return findDifferentialMSDData.run(eachOrg, orgSyncModels[eachOrg]);
                }
                else if (orgSyncModels[eachOrg][0].syncType === 'vend') {
                    logger.debug({
                        message: 'Will find differential Vend data for this org',
                        organisation: eachOrg,
                        functionName: 'routeToWorker'
                    });
                    var findDifferentialVendData = require('./workers-v2/find-differential-data/find-differential-vend-data');
                    return findDifferentialVendData.run(eachOrg, orgSyncModels[eachOrg]);
                }
            })
            .catch(function (error) {
                logger.error({
                    message: 'Could not initiate sync for org',
                    error,
                    eachOrg,
                    functionName: 'routeToWorker'
                });
                return Promise.reject('Could not initiate sync for org, will move on');
            })
            .then(function (response) {
                logger.debug({
                    message: 'Successfully synced data for org, will update syncInProcess to false',
                    response,
                    eachOrg
                });
                return db.collection('SyncModel').updateMany({
                    orgModelId: ObjectId(eachOrg)
                }, {
                    $set: {
                        syncInProcess: false
                    }
                })
            }).then(function (response) {
                var options = {
                    method: 'POST',
                    uri: utils.API_URL + '/api/OrgModels/' + eachOrg + '/notifySyncToAll',
                    json: true,
                    body: {
                        data: {
                            loading: false
                        }
                    }
                };
                logger.debug({
                    message: 'Starting Sync , Notifying Users',
                    response,
                    options
                });
                return rp(options);
            })
            .catch(function (error) {
                logger.error({
                    message: 'Could not update sync status, will move on',
                    error,
                    functionName: 'routeToWorker',
                    eachOrg
                });
                return Promise.resolve('Could not update sync status, will move on');
            });
    });
}
