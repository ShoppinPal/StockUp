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

logger.debug({
    message: '************ Sync Worker Initiated ************'
});

return MongoClient.connect(dbUrl, {promiseLibrary: Promise})
    .catch(function (error) {
        logger.error({
            error,
            message: 'Could not connect to Mongo DB'
        });
        return Promise.reject(error);
    })
    .then(function (dbInstance) {
        logger.debug({
            message: 'Connected to mongodb database, will look for sync models to sync'
        });
        db = dbInstance;
        return runSyncJobs();
    })
    .then(function (response) {
        logger.debug({
            message: 'Sync job limit reached, will exit',
            response
        });
        process.exit(SUCCESS);
    })
    .catch(function (error) {
        logger.error({
            error,
            message: 'Error in running sync jobs'
        });
        process.exit(FAILURE);
    });

function runSyncJobs() {
    if (retryCount>0) {
        return db.collection('SyncModel').find({
            $where: "(Date.now() - Date.parse(this.lastSyncedAt))/1000 >= this.syncIntervalInSeconds"
        }).toArray()
            .catch(function (error) {
                logger.error({
                    message: 'Could not fetch sync models from db',
                    error,
                    retryCount
                });
                return Promise.reject(error);
            })
            .then(function (syncModelInstances) {
                if (syncModelInstances.length) {
                    logger.debug({
                        message: 'Found these syncModels',
                        syncModelInstances,
                        retryCount
                    });
                    var batch = db.collection('SyncModel').initializeUnorderedBulkOp();
                    _.each(syncModelInstances, function (eachSyncModel) {
                        batch.find(eachSyncModel).updateOne({
                            $set: {
                                lastSyncedAt: new Date()
                            }
                        });
                    });
                    return batch.execute();
                }
                else {
                    logger.debug({
                        message: 'Found no sync models to run, will retry in some time',
                        retryInterval,
                        retryCount
                    });
                    return Promise.resolve('Found no sync models');
                }
            })
            .then(function (response) {
                logger.debug({
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
                    message: 'Some error',
                    error,
                    retryCount
                });
            });
    }
    else {
        logger.debug({
            message: 'Max worker retries reached, will shut down and restart',
            retryCount
        });
        return Promise.resolve('Max worker retries reached, will shut down and restart');
    }
}
