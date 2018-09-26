'use strict';
var Promise = require('bluebird');
const path = require('path');
const fileName = path.basename(__filename, '.js'); // gives the filename without the .js extension
const logger = require('sp-json-logger')({fileName: 'common:models:' + fileName});
var workers = require('./../utils/workers');

module.exports = function (SyncModel) {

    SyncModel.initiateVendSync = function (id, options) {
        logger.debug({
            message: 'Will initiate vend sync',
            options,
            functionName: 'initiateVendSync'
        });
        var syncModels = ['products', 'suppliers', 'inventory'];
        return Promise.map(syncModels, function (eachSyncModel) {
            return SyncModel.findOrCreate({
                name: eachSyncModel,
                orgModelId: id
            },{
                name: eachSyncModel,
                version: 0,
                orgModelId: id,
                syncInProcess: false,
                lastSyncedAt: new Date()
            });
        })
            .then(function (syncModels) {
                logger.debug({
                    message: 'Sync models created, will initiate their sync through workers now',
                    options,
                    syncModels,
                    functionName: 'initiateVendSync'
                });
                logger.debug({
                    message: 'Will find organisation\'s vend integration details',
                    functionName: 'initiateVendSync',
                    options
                });
                return SyncModel.app.models.IntegrationModel.find({
                    where: {
                        orgModelId: id
                    }
                });
            })
            .then(function (integrationModels) {
                if (!integrationModels.length) {
                    logger.error({
                        message: 'Organisation is not integrated with vend',
                        functionName: 'initiateVendSync',
                        options
                    });
                    return Promise.reject('Organisation is not integrated with vend');
                }
                else {
                    var vendConfig = SyncModel.app.get('integrations').vend;
                    var payload = {
                        op: SyncModel.app.get('findDifferentialVendData'),
                        tokenService: 'https://' + integrationModels[0].domain_prefix + vendConfig.token_service,
                        clientId: vendConfig.client_id,
                        clientSecret: vendConfig.client_secret,
                        tokenType: integrationModels[0].token_type,
                        accessToken: integrationModels[0].access_token,
                        refreshToken: integrationModels[0].refresh_token,
                        domainPrefix: integrationModels[0].domain_prefix,
                        loopbackServerUrl: SyncModel.app.get('site').baseUrl || process.env['site:baseUrl'],
                        loopbackAccessToken: options.accessToken, // let it be the full json object
                        name: integrationModels[0].domain_prefix,
                        vendDataObjects: syncModels,
                        orgModelId: id
                    };
                    return workers.sendPayLoad(payload);
                }
            })
            .then(function (response) {
                logger.debug({
                    message: 'Sent payload to worker to initiate sync, will update sync models with status',
                    response,
                    functionName: 'initiateVendSync',
                    options
                });
                return Promise.map(syncModels, function (eachModel) {
                    return SyncModel.updateAll({
                        name: eachModel
                    }, {
                        syncInProcess: true,
                        workerTaskId: response.MessageId
                    });
                });
            })
            .then(function (response) {
                logger.debug({
                    message: 'Updated syncInProgress for:',
                    functionName: 'initiateVendSync',
                    options,
                    response
                });
                return Promise.resolve();
            })
            .catch(function (error) {
                // log('initiateSync').error('ERROR', error);
                logger.error({
                    error,
                    options,
                    functionName: 'initiateVendSync'
                });
                return Promise.reject(error);
            });
    };

    SyncModel.initiateSync = function (id, names, cb) {
        var currentUser = SyncModel.getCurrentUserModel(cb); // returns  immediately if no currentUser
        // log('initiateSync').debug('Initiating sync for ', names);
        logger.tag('initiateSync').debug({
            log: {
                message: 'Initiating sync for',
                names: names
            }
        });
        var filter = {
            include: 'syncModels',
            scope: {
                where: {
                    name: {
                        inq: names
                    }
                }
            }
        };
        var storeConfigInstance, syncModels, syncInProgressNames;

        return SyncModel.app.models.StoreConfigModel.findById(id, filter)
            .then(function (storeConfigModelInstance) {
                storeConfigInstance = storeConfigModelInstance;
                if (!storeConfigModelInstance) {
                    // log('initiateSync').error('Could not find the organisation', id);
                    logger.tag('initiateSync').debug({
                        log: {
                            message: 'Could not find the organisation',
                            id: id
                        }
                    });
                    return Promise.reject('Could not find your organisation');
                }
                else {
                    // log('initiateSync').debug('Found this storeConfigModel', JSON.stringify(storeConfigModelInstance, null, 2));
                    // log('initiateSync').debug('Found these sync models', storeConfigModelInstance.syncModels());
                    logger.tag('initiateSync').debug({
                        log: {
                            message: 'Found following storeConfigModel and sync models',
                            storeConfigModel: storeConfigModelInstance,
                            syncModels: storeConfigModelInstance.syncModels()
                        }
                    });
                    if (!storeConfigModelInstance.syncModels() || !storeConfigModelInstance.syncModels().length) {
                        // log('initiateSync').debug('No sync models found for current org, will initiate sync models first');
                        logger.tag('initiateSync').debug({
                            log: {
                                message: 'No sync models found for current org, will initiate sync models first'
                            }
                        });
                        return Promise.map(names, function (eachName) {
                            return SyncModel.create({
                                name: eachName,
                                version: 0,
                                syncInProcess: false,
                                storeConfigModelId: id
                            });
                        })
                    }
                    else {
                        //TODO: reject the ones whose syncs are already in progress
                        return Promise.resolve(storeConfigModelInstance.syncModels());
                    }
                }
            })
            .then(function (response) {
                syncModels = response;
                // log('initiateSync').debug('Found the following sync versions', syncModels);
                logger.tag('initiateSync').debug({
                    log: {
                        message: 'Found the following sync versions',
                        syncModels: syncModels
                    }
                });
                var posUrl = storeConfigInstance.posUrl;
                var regexp = /^https?:\/\/(.*)\.vendhq\.com$/i;
                var matches = posUrl.match(regexp);
                var domainPrefix = matches[1];
                // log('initiateSync').debug('Creating new access token for workers');
                logger.tag('initiateSync').debug({
                    log: {
                        message: 'Creating new access token for workers'
                    }
                });
                return Promise.all([currentUser.createAccessTokenAsync(1209600), domainPrefix]);// can't be empty ... time to live (in seconds) 1209600 is 2 weeks (default of loopback)
            })
            .then(function (response) {
                var newAccessToken = response[0];
                var domainPrefix = response[1];
                var payload = {
                    op: SyncModel.app.get('findDifferentialVendData'),
                    tokenService: 'https://{DOMAIN_PREFIX}.vendhq.com/api/1.0/token', //TODO: fetch from global-config or config.*.json
                    clientId: SyncModel.app.get('vend').client_id,
                    clientSecret: SyncModel.app.get('vend').client_secret,
                    tokenType: 'Bearer',
                    accessToken: storeConfigInstance.vendAccessToken,
                    refreshToken: storeConfigInstance.vendRefreshToken,
                    domainPrefix: domainPrefix, //'fermiyontest',
                    loopbackServerUrl: process.env['site:baseUrl'] || SyncModel.app.get('site').baseUrl,
                    loopbackAccessToken: newAccessToken, // let it be the full json object
                    name: domainPrefix,
                    vendDataObjects: names,
                    storeConfigModelId: storeConfigInstance.id
                };
                return workers.sendPayLoad(payload);
            })
            .then(function (response) {
                // log('initiateSync').debug('Sent payload to worker to initiate sync, will update sync models with status');
                logger.tag('initiateSync').debug({
                    log: {
                        message: 'Sent payload to worker to initiate sync, will update sync models with status'
                    }
                });
                return Promise.map(syncModels, function (eachModel) {
                    return SyncModel.updateAll({
                        name: eachModel.name
                    }, {
                        syncInProcess: true,
                        workerTaskId: response.MessageId
                    });
                });
            })
            .then(function (response) {
                // log('initiateSync').debug('Updated syncInProgress for ', names);
                logger.tag('initiateSync').debug({
                    log: {
                        message: 'Updated syncInProgress for:',
                        name: names
                    }
                });
                return Promise.resolve();
            })
            .catch(function (error) {
                // log('initiateSync').error('ERROR', error);
                logger.tag('initiateSync').error({
                    error: error
                });
                return Promise.reject(error);
            });
    };

};
