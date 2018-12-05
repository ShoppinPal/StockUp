'use strict';
var Promise = require('bluebird');
const path = require('path');
const fileName = path.basename(__filename, '.js'); // gives the filename without the .js extension
const logger = require('sp-json-logger')({fileName: 'common:models:' + fileName});
var workers = require('./../utils/workers');
const rp = require('request-promise');

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
            }, {
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

    SyncModel.initiateMSDSync = function (id, options) {
        logger.debug({
            message: 'Will initiate msd sync',
            options,
            functionName: 'initiateMSDSync'
        });
        var syncModels = [{
            name: 'products',
            tableName: 'EcoResProductVariantStaging'
        }, {
            name: 'inventory',
            tableName: 'HSInventDimStaging'
        }];
        return Promise.map(syncModels, function (eachSyncModel) {
            return SyncModel.findOrCreate({
                where: {
                    name: eachSyncModel.name,
                    orgModelId: id
                }
            }, {
                name: eachSyncModel.name,
                tableName: eachSyncModel.tableName,
                syncType: 'msd',
                orgModelId: id,
                syncInProcess: false,
                lastSyncedAt: new Date(1970), //some old date so that sync worker picks it up immediately
            });
        })
            .then(function (response) {
                logger.debug({
                    message: 'Created sync models for org',
                    orgModelId: id,
                    options,
                    functionName: 'initiateMSDSync'
                });
                return Promise.resolve(syncModels.length);
            })
            .catch(function (error) {
                logger.error({
                    error,
                    options,
                    functionName: 'initiateMSDSync'
                });
                return Promise.reject(error);
            });
    };

    SyncModel.stopMSDSync = function (id, options) {
        logger.debug({
            message: 'Will delete sync models for this organisation',
            orgModelId: id,
            options,
            functionName: 'stopMSDSync'
        });
        return SyncModel.destroyAll({
            orgModelId: id
        })
            .then(function (response) {
                logger.debug({
                    message: 'Deleted all sync models for this organisation',
                    orgModelId: id,
                    response,
                    options,
                    functionName: 'stopMSDSync'
                });
                return Promise.resolve(true);
            })
            .catch(function (error) {
                logger.error({
                    error,
                    options,
                    functionName: 'stopMSDSync'
                });
                return Promise.reject(error);
            });
    };

    SyncModel.syncMSDUsers = function (id, options) {
        logger.debug({
            message: 'Will sync users for MSD',
            orgModelId: id,
            options,
            functionName: 'syncMSDUsers'
        });
        var MSDUtil = require('./../utils/msd')({GlobalOrgModel: SyncModel.app.models.OrgModel});
        return MSDUtil.fetchMSDData(id, 'SystemUsers')
            .catch(function (error) {
                logger.error({
                    error,
                    message: 'Could not fetch MSD Data',
                    orgModelId: id,
                    functionName: 'syncMSDUsers'
                });
                return Promise.reject('Could not fetch MSD Data');
            })
            .then(function (users) {
                if (users.value && users.value.length) {
                    logger.debug({
                        message: 'Found users from MSD, will save to DB',
                        numberOfUsers: users.value.length,
                        functionName: 'syncMSDUsers'
                    });
                    var usersToCreate = [];
                    for (var i = 0; i<users.value.length; i++) {
                        if(users.value[i].Email.length) {
                            usersToCreate.push({
                                email: users.value[i].Email,
                                name: users.value[i].UserName,
                                userId: users.value[i].UserID,
                                password: Math.random().toString(36).slice(-8),
                                orgModelId: id
                            });
                        }
                    }
                    return Promise.map(usersToCreate, function (eachUser) {
                        return SyncModel.app.models.UserModel.findOrCreate({
                            where: {
                                email: eachUser.email
                            }
                        }, eachUser);
                    });
                }
                else {
                    logger.debug({
                        message: 'No users found in MSD',
                        functionName: 'syncMSDUsers'
                    });
                    return Promise.reject('No users found in MSD');
                }
            })
            .then(function (result) {
                logger.debug({
                    message: 'Saved users to DB',
                    result: result,
                    functionName: 'syncMSDUsers'
                });
                return Promise.resolve(true);
            })
            .catch(function (error) {
                logger.error({
                    message: 'Could not create users',
                    orgModelId: id,
                    error,
                    functionName: 'syncMSDUsers'
                });
                return Promise.reject('Could not create users for org');
            });
    };

    SyncModel.syncMSDStores = function (id, options) {
        logger.debug({
            message: 'Will sync stores for MSD',
            orgModelId: id,
            options,
            functionName: 'syncMSDStores'
        });
        var MSDUtil = require('./../utils/msd')({GlobalOrgModel: SyncModel.app.models.OrgModel});
        return MSDUtil.fetchMSDData(id, 'RetailChannels')
            .catch(function (error) {
                logger.error({
                    error,
                    message: 'Could not fetch MSD Data',
                    orgModelId: id,
                    functionName: 'syncMSDStores'
                });
                return Promise.reject('Could not fetch MSD Data');
            })
            .then(function (stores) {
                if (stores.value && stores.value.length) {
                    logger.debug({
                        message: 'Found stores from MSD, will save to DB',
                        numberOfUsers: stores.value.length,
                        functionName: 'syncMSDStores'
                    });
                    var storesToCreate = [];
                    for (var i = 0; i<stores.value.length; i++) {
                        if(stores.value[i].Name.length) {
                            storesToCreate.push({
                                name: stores.value[i].Name,
                                currency: stores.value[i].Currency,
                                storeNumber: stores.value[i].StoreNumber,
                                orgModelId: id
                            });
                        }
                    }
                    return Promise.map(storesToCreate, function (eachStore) {
                        return SyncModel.app.models.StoreModel.findOrCreate({
                            where: {
                                storeNumber: eachStore.storeNumber
                            }
                        }, eachStore);
                    });
                }
                else {
                    logger.debug({
                        message: 'No stores found in MSD',
                        functionName: 'syncMSDStores'
                    });
                    return Promise.reject('No users found in MSD');
                }
            })
            .then(function (result) {
                logger.debug({
                    message: 'Saved stores to DB',
                    result: result,
                    functionName: 'syncMSDStores'
                });
                return Promise.resolve(true);
            })
            .catch(function (error) {
                logger.error({
                    message: 'Could not create stores',
                    orgModelId: id,
                    error,
                    functionName: 'syncMSDStores'
                });
                return Promise.reject('Could not create stores for org');
            });
    };

    SyncModel.syncMSDUsers = function (id, options) {
        logger.debug({
            message: 'Will sync users for MSD',
            orgModelId: id,
            options,
            functionName: 'syncMSDUsers'
        });
        var MSDUtil = require('./../utils/msd')({GlobalOrgModel: SyncModel.app.models.OrgModel});
        return MSDUtil.fetchMSDData(id, 'SystemUsers')
            .catch(function (error) {
                logger.error({
                    error,
                    message: 'Could not fetch MSD Data',
                    orgModelId: id,
                    functionName: 'syncMSDUsers'
                });
                return Promise.reject('Could not fetch MSD Data');
            })
            .then(function (users) {
                if (users.value && users.value.length) {
                    logger.debug({
                        message: 'Found users from MSD, will save to DB',
                        numberOfUsers: users.value.length,
                        functionName: 'syncMSDUsers'
                    });
                    var usersToCreate = [];
                    for (var i = 0; i<users.value.length; i++) {
                        if(users.value[i].Email.length) {
                            usersToCreate.push({
                                email: users.value[i].Email,
                                name: users.value[i].UserName,
                                userId: users.value[i].UserID,
                                password: Math.random().toString(36).slice(-8),
                                orgModelId: id
                            });
                        }
                    }
                    return Promise.map(usersToCreate, function (eachUser) {
                        return SyncModel.app.models.UserModel.findOrCreate({
                            where: {
                                email: eachUser.email
                            }
                        }, eachUser);
                    });
                }
                else {
                    logger.debug({
                        message: 'No users found in MSD',
                        functionName: 'syncMSDUsers'
                    });
                    return Promise.reject('No users found in MSD');
                }
            })
            .then(function (result) {
                logger.debug({
                    message: 'Saved users to DB',
                    result: result,
                    functionName: 'syncMSDUsers'
                });
                return Promise.resolve(true);
            })
            .catch(function (error) {
                logger.error({
                    message: 'Could not create users',
                    orgModelId: id,
                    error,
                    functionName: 'syncMSDUsers'
                });
                return Promise.reject('Could not create users for org');
            });
    };

};
