const path = require('path');
const fileName = path.basename(__filename, '.js'); // gives the filename without the .js extension
const logger = require('sp-json-logger')({fileName: 'common:models:' + fileName});
const MongoClient = require('mongodb').MongoClient;
const dbUrl = process.env.DB_URL;
const Promise = require('bluebird');
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
            $where: "function(){return ((Date.now() - Date.parse(this.lastSyncedAt))/1000 >= "+syncInterval+")}"
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
        if(orgSyncModels[eachOrg][0].syncType === 'msd') {
            logger.debug({
                fileName,
                message: 'Will find differential msd data for this org',
                organisation: eachOrg
            });
            var findDifferentialMSDData = require('./workers-v2/find-differential-data/find-differential-msd-data');
            return findDifferentialMSDData.run(eachOrg, orgSyncModels[eachOrg]);
        }
        else if(orgSyncModels[eachOrg].type === 'vend') {
            logger.debug({
                fileName,
                message: 'Vend ka baad me dekhenge',
                organisation: eachOrg
            });
            return Promise.resolve('Vend ka baad me');
        }
    });
}
