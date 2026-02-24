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

const Sentry = require('@sentry/node');
var sentryDNS = process.env.STOCKUP_SENTRY_WORKER_V3_DNS;
var sentrySyncAlertsDNS = process.env.STOCKUP_SENTRY_SYNC_ALERTS_DNS;

Sentry.init({ dsn: sentryDNS });

logger.debug({
    message: 'Sentry initiated at sync worker',
    env: process.env.VM_EXTERNAL_IP,
    sentryDNS: sentryDNS,
    sentrySyncAlertsDNS: sentrySyncAlertsDNS
});

// Stuck sync threshold: 1 hour in milliseconds
const STUCK_SYNC_THRESHOLD_MS = 60 * 60 * 1000;

/**
 * Send Sentry alert for stuck sync - error-prone (silently ignores errors)
 * Uses separate DSN for sync alerts if configured
 */
function sendStuckSyncAlert(orgModelId, lastSyncedAt, syncModels) {
    try {
        if (!sentrySyncAlertsDNS) {
            logger.debug({
                fileName,
                message: 'No Sentry sync alerts DSN configured, skipping alert',
                orgModelId
            });
            return;
        }

        // Create a separate Sentry hub for sync alerts
        const syncAlertHub = new Sentry.Hub(new Sentry.NodeClient({
            dsn: sentrySyncAlertsDNS
        }));

        const stuckDurationMinutes = Math.round((Date.now() - new Date(lastSyncedAt).getTime()) / (60 * 1000));

        syncAlertHub.withScope(function(scope) {
            scope.setTag('alert_type', 'stuck_sync');
            scope.setTag('org_model_id', orgModelId);
            scope.setExtra('lastSyncedAt', lastSyncedAt);
            scope.setExtra('stuckDurationMinutes', stuckDurationMinutes);
            scope.setExtra('syncModels', syncModels ? syncModels.map(function(s) { return s.name; }) : []);

            syncAlertHub.captureMessage(
                'Organisation sync stuck for more than 1 hour: ' + orgModelId,
                'warning'
            );
        });

        logger.debug({
            fileName,
            message: 'Sent Sentry alert for stuck sync',
            orgModelId,
            stuckDurationMinutes
        });
    } catch (error) {
        // Silently ignore any Sentry errors - this should never break the sync process
        logger.warn({
            fileName,
            message: 'Could not send Sentry alert for stuck sync (ignoring)',
            orgModelId,
            error: error.message || error
        });
    }
}

/**
 * Check for stuck syncs and reset them
 * A sync is considered stuck if syncInProcess=true AND lastSyncedAt is more than 1 hour ago
 */
function resetStuckSyncs() {
    var oneHourAgo = new Date(Date.now() - STUCK_SYNC_THRESHOLD_MS);

    return db.collection('SyncModel').find({
        syncInProcess: true,
        lastSyncedAt: { $lt: oneHourAgo }
    }).toArray()
        .then(function(stuckSyncModels) {
            if (!stuckSyncModels || stuckSyncModels.length === 0) {
                logger.debug({
                    fileName,
                    message: 'No stuck sync models found'
                });
                return Promise.resolve();
            }

            // Group stuck syncs by org
            var stuckByOrg = _.groupBy(stuckSyncModels, function(s) {
                return s.orgModelId.toString();
            });

            logger.warn({
                fileName,
                message: 'Found stuck sync models, will reset them',
                stuckOrgCount: Object.keys(stuckByOrg).length,
                stuckSyncCount: stuckSyncModels.length
            });

            // Send Sentry alerts for each stuck org and reset
            return Promise.map(Object.keys(stuckByOrg), function(orgModelId) {
                var orgSyncModels = stuckByOrg[orgModelId];
                var lastSyncedAt = orgSyncModels[0].lastSyncedAt;

                // Send Sentry alert (error-prone - won't break on failure)
                sendStuckSyncAlert(orgModelId, lastSyncedAt, orgSyncModels);

                // Reset syncInProcess to false for this org
                return db.collection('SyncModel').updateMany({
                    orgModelId: ObjectId(orgModelId),
                    syncInProcess: true
                }, {
                    $set: {
                        syncInProcess: false
                    }
                })
                    .then(function(result) {
                        logger.debug({
                            fileName,
                            message: 'Reset stuck sync models for org',
                            orgModelId,
                            modifiedCount: result.modifiedCount || result.result.nModified
                        });
                        return Promise.resolve();
                    })
                    .catch(function(error) {
                        logger.error({
                            fileName,
                            message: 'Could not reset stuck sync models for org (will continue)',
                            orgModelId,
                            error
                        });
                        return Promise.resolve(); // Don't fail the whole process
                    });
            }, { concurrency: 1 });
        })
        .catch(function(error) {
            logger.error({
                fileName,
                message: 'Could not check for stuck sync models (will continue)',
                error
            });
            return Promise.resolve(); // Don't fail the whole process
        });
}

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
        // First, check for and reset any stuck syncs (syncInProcess=true for > 1 hour)
        return resetStuckSyncs()
            .then(function() {
                // Now fetch sync models that are ready to sync
                return db.collection('SyncModel').find({
                    $and: [
                        {
                            $where: "function(){return ((Date.now() - Date.parse(this.lastSyncedAt))/1000 >= " + syncInterval + ")}"
                        },
                        {
                            syncInProcess: false
                        }
                    ]
                }).toArray();
            })
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
                    message: 'Could not initiate sync for org, will reset syncInProcess to false',
                    error,
                    eachOrg,
                    functionName: 'routeToWorker'
                });
                // IMPORTANT: Reset syncInProcess to false on error so the sync can be retried
                return db.collection('SyncModel').updateMany({
                    orgModelId: ObjectId(eachOrg)
                }, {
                    $set: {
                        syncInProcess: false
                        // Don't update lastSyncedAt on error - let it retry sooner
                    }
                })
                    .then(function() {
                        logger.debug({
                            message: 'Reset syncInProcess to false after error',
                            eachOrg,
                            functionName: 'routeToWorker'
                        });
                        return Promise.resolve('Sync failed but reset flag');
                    })
                    .catch(function(resetError) {
                        logger.error({
                            message: 'Could not reset syncInProcess after error',
                            resetError,
                            eachOrg,
                            functionName: 'routeToWorker'
                        });
                        return Promise.resolve('Sync failed and could not reset flag');
                    });
            })
            .then(function (response) {
                // Skip if this is a recovery from error (response is a string message)
                if (typeof response === 'string' && response.includes('Sync failed')) {
                    logger.debug({
                        message: 'Skipping success update - this was an error recovery',
                        response,
                        eachOrg
                    });
                    return Promise.resolve(response);
                }
                logger.debug({
                    message: 'Successfully synced data for org, will update syncInProcess to false',
                    response,
                    eachOrg
                });
                return db.collection('SyncModel').updateMany({
                    orgModelId: ObjectId(eachOrg)
                }, {
                    $set: {
                        syncInProcess: false,
                        lastSyncedAt: new Date()
                    }
                });
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
    }, {
        concurrency: 1
    });
}
