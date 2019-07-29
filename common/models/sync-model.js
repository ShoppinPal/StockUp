'use strict';
var Promise = require('bluebird');
const path = require('path');
const fileName = path.basename(__filename, '.js'); // gives the filename without the .js extension
const logger = require('sp-json-logger')({fileName: 'common:models:' + fileName});
var workers = require('./../utils/workers');
const rp = require('request-promise');
const _ = require('underscore');

module.exports = function (SyncModel) {

    SyncModel.initiateVendSync = function (id, options) {
        logger.debug({
            message: 'Will initiate vend sync for org',
            options,
            functionName: 'initiateVendSync'
        });
        var syncModels = ['products', 'suppliers', 'inventory'];
        return Promise.map(syncModels, function (eachSyncModel) {
            return SyncModel.findOrCreate({
                where: {
                    name: eachSyncModel,
                    orgModelId: id
                }
            }, {
                name: eachSyncModel,
                version: 0,
                syncType: 'vend',
                orgModelId: id,
                syncInProcess: false,
                lastSyncedAt: new Date(1970) // some old date so that sync-engine picks it up immediately
            });
        })
            .then(function (syncModels) {
                logger.debug({
                    message: 'Sync models created',
                    options,
                    syncModels,
                    functionName: 'initiateVendSync'
                });
                // logger.debug({
                //     message: 'Will find organisation\'s vend integration details',
                //     functionName: 'initiateVendSync',
                //     options
                // });
                // return SyncModel.app.models.IntegrationModel.find({
                //     where: {
                //         orgModelId: id
                //     }
                // });
                // })
                // .then(function (integrationModels) {
                //     if (!integrationModels.length) {
                //         logger.error({
                //             message: 'Organisation is not integrated with vend',
                //             functionName: 'initiateVendSync',
                //             options
                //         });
                //         return Promise.reject('Organisation is not integrated with vend');
                //     }
                //     else {
                //         var vendConfig = SyncModel.app.get('integrations').vend;
                //         var payload = {
                //             op: SyncModel.app.get('findDifferentialVendData'),
                //             tokenService: 'https://' + integrationModels[0].domain_prefix + vendConfig.token_service,
                //             clientId: vendConfig.client_id,
                //             clientSecret: vendConfig.client_secret,
                //             tokenType: integrationModels[0].token_type,
                //             accessToken: integrationModels[0].access_token,
                //             refreshToken: integrationModels[0].refresh_token,
                //             domainPrefix: integrationModels[0].domain_prefix,
                //             loopbackServerUrl: SyncModel.app.get('site').baseUrl || process.env['site:baseUrl'],
                //             loopbackAccessToken: options.accessToken, // let it be the full json object
                //             name: integrationModels[0].domain_prefix,
                //             vendDataObjects: syncModels,
                //             orgModelId: id
                //         };
                //         return workers.sendPayLoad(payload);
                //     }
                // })
                // .then(function (response) {
                //     logger.debug({
                //         message: 'Sent payload to worker to initiate sync, will update sync models with status',
                //         response,
                //         functionName: 'initiateVendSync',
                //         options
                //     });
                //     return Promise.map(syncModels, function (eachModel) {
                //         return SyncModel.updateAll({
                //             name: eachModel
                //         }, {
                //             syncInProcess: true,
                //             workerTaskId: response.MessageId
                //         });
                //     });
                // })
                // .then(function (response) {
                //     logger.debug({
                //         message: 'Updated syncInProgress for:',
                //         functionName: 'initiateVendSync',
                //         options,
                //         response
                //     });

                return Promise.resolve(syncModels.length);
            })
            .catch(function (error) {
                // log('initiateSync').error('ERROR', error);
                logger.error({
                    message: 'Could not create sync models for Vend',
                    error,
                    options,
                    functionName: 'initiateVendSync'
                });
                return Promise.reject(error);
            });
    };

    SyncModel.initiateMSDSync = function (id, options) {

        logger.debug({
            message: 'Will look for org\'s integration model for database details',
            functionName: 'initiateMSDSync',
            options
        });
        return Promise.resolve()
            .then(function () {
                logger.debug({
                    message: 'Will initiate msd sync',
                    options,
                    functionName: 'initiateMSDSync'
                });
                var syncModels = [
                    {
                        name: 'products',
                        tableName: 'EcoResProductVariantStaging'
                    },
                    {
                        name: 'productCategories',
                        tableName: 'EcoResProductV2Staging'
                    },
                    {
                        name: 'inventoryDims',
                        tableName: 'HSInventDimStaging'
                    },
                    {
                        name: 'inventorySums',
                        tableName: 'HSInventSumStaging'
                    },
                    {
                        name: 'sales',
                        tableName: 'RetailTransactionStaging'
                    },
                    {
                        name: 'salesLines',
                        tableName: 'RetailTransactionSalesLineStaging'
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
                });
            })
            .then(function (response) {
                logger.debug({
                    message: 'Created sync models for org',
                    orgModelId: id,
                    options,
                    response,
                    functionName: 'initiateMSDSync'
                });
                return Promise.resolve(response.length);
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
                        if (users.value[i].Email.length) {
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
                                email: eachUser.email,
                                orgModelId: id
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
                    message: 'Saved users to DB, will assign storeManager roles to all currently',
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

    SyncModel.syncMSDCategories = function (id, options) {
        logger.debug({
            message: 'Will sync categories for MSD',
            orgModelId: id,
            options,
            functionName: 'syncMSDCategories'
        });
        var MSDUtil = require('./../utils/msd')({GlobalOrgModel: SyncModel.app.models.OrgModel});
        return MSDUtil.fetchMSDData(id, 'ProductCategories')
            .catch(function (error) {
                logger.error({
                    error,
                    message: 'Could not fetch MSD Data',
                    orgModelId: id,
                    functionName: 'syncMSDCategories'
                });
                return Promise.reject('Could not fetch MSD Data');
            })
            .then(function (categories) {
                if (categories.value && categories.value.length) {
                    logger.debug({
                        message: 'Found categories from MSD, will save to DB',
                        numberOfUsers: categories.value.length,
                        functionName: 'syncMSDCategories'
                    });
                    var categoriesToCreate = [];
                    for (var i = 0; i<categories.value.length; i++) {
                        if (categories.value[i].CategoryName.length) {
                            categoriesToCreate.push({
                                name: categories.value[i].CategoryName,
                                orgModelId: id
                            });
                        }
                    }
                    return Promise.map(categoriesToCreate, function (eachCategory) {
                        return SyncModel.app.models.CategoryModel.findOrCreate({
                            where: {
                                orgModelId: id,
                                name: eachCategory.CategoryName
                            }
                        }, eachCategory);
                    });
                }
                else {
                    logger.debug({
                        message: 'No categories found in MSD',
                        orgModelId: id,
                        functionName: 'syncMSDCategories'
                    });
                    return Promise.reject('No categories found in MSD');
                }
            })
            .then(function (result) {
                logger.debug({
                    message: 'Saved categories to DB',
                    result: result,
                    functionName: 'syncMSDCategories'
                });
                return Promise.resolve(true);
            })
            .catch(function (error) {
                logger.error({
                    message: 'Could not create categories',
                    orgModelId: id,
                    error,
                    functionName: 'syncMSDCategories'
                });
                return Promise.reject('Could not create categories for org');
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
        return MSDUtil.fetchMSDData(id, 'OperationalSites', 'dataAreaId')
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
                        if (stores.value[i].SiteName.length) {
                            storesToCreate.push({
                                name: stores.value[i].SiteName,
                                timeZone: stores.value[i].SiteTimezone,
                                storeNumber: stores.value[i].SiteId,
                                city: stores.value[i].PrimaryAddressCity,
                                orgModelId: id
                            });
                        }
                    }
                    return Promise.map(storesToCreate, function (eachStore) {
                        return SyncModel.app.models.StoreModel.findOrCreate({
                            where: {
                                storeNumber: eachStore.storeNumber,
                                orgModelId: id
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

    SyncModel.syncVendStores = function (id, options) {
        logger.debug({
            message: 'Will sync vend stores',
            functionName: 'syncVendStores',
            options
        });
        var vendUtils = require('./../../common/utils/vend')({OrgModel: SyncModel.app.models.OrgModel});
        return vendUtils.getVendOutlets(id, options)
            .catch(function (error) {
                logger.error({
                    message: 'Could not fetch vend stores',
                    error,
                    functionName: 'getVendOutlets',
                    options
                });
            })
            .then(function (response) {
                logger.debug({
                    message: 'Fetched vend stores, will save to db',
                    response,
                    functionName: 'getVendOutlets',
                    options
                });
                if (response && response.length) {
                    return Promise.map(response, function (eachStore) {
                        if (eachStore.email) {
                            return SyncModel.app.models.StoreModel.findOrCreate({
                                where: {
                                    storeNumber: eachStore.id,
                                    orgModelId: id
                                }
                            }, {
                                name: eachStore.name,
                                currency: eachStore.currency,
                                storeNumber: eachStore.id,
                                email: eachStore.email,
                                orgModelId: id
                            });
                        }
                    });
                }
                else {
                    logger.error({
                        message: 'Could not fetch any stores from vend',
                        options,
                        functionName: 'syncVendStores'
                    });
                    return Promise.reject('Could not fetch any stores from vend');
                }
            })
            .catch(function (error) {
                logger.error({
                    message: 'Could not save stores to db',
                    error,
                    options,
                    functionName: 'syncVendStores'
                });
                return Promise.reject('Could not save stores to db');
            })
            .then(function (response) {
                logger.debug({
                    message: 'Saved stores to db, will create users for them',
                    response,
                    options,
                    functionName: 'syncVendStores'
                });
                var usersToCreate = [];
                for (var i = 0; i<response.length; i++) {
                    if (response[i] && response[i][0].email) {
                        usersToCreate.push({
                            name: response[i][0].name,
                            email: response[i][0].email,
                            password: Math.random().toString(36).slice(-8),
                            orgModelId: id,
                            userId: response[i][0].email,
                            storeModelId: response[i][0].objectId
                        });
                    }
                }
                logger.debug({
                    message: 'Will create following users',
                    usersToCreate,
                    options,
                    functionName: 'syncVendStores'
                });
                return Promise.map(usersToCreate, function (eachUser) {
                    return SyncModel.app.models.UserModel.findOrCreate({
                        where: {
                            orgModelId: id,
                            email: eachUser.email
                        }
                    }, eachUser);
                });
            })
            .catch(function (error) {
                logger.error({
                    message: 'Could not save users to DB',
                    error,
                    options,
                    functionName: 'syncVendStores'
                });
                return Promise.reject('Could not save users to DB');
            })
            .then(function (response) {
                logger.debug({
                    message: 'Saved users to db',
                    response,
                    options,
                    functionName: 'syncVendStores'
                });
                return Promise.resolve('Synced stores and created users');
            });
    };

    SyncModel.syncVendUsers = function (id, options) {
        logger.debug({
            message: 'Will sync vend users',
            functionName: 'syncVendUsers',
            options
        });
        var vendUsers, usersCreated;
        var vendUtils = require('./../../common/utils/vend')({OrgModel: SyncModel.app.models.OrgModel});
        return vendUtils.getVendUsers(id, options)
            .catch(function (error) {
                logger.error({
                    message: 'Could not fetch vend users',
                    error,
                    functionName: 'getVendUsers',
                    options
                });
            })
            .then(function (response) {
                vendUsers = response;
                logger.debug({
                    message: 'Fetched users, will save to DB',
                    response,
                    options,
                    functionName: 'syncVendUsers'
                });
                var usersToCreate = [];
                for (var i = 0; i<response.length; i++) {
                    if (response[i].email) {
                        usersToCreate.push({
                            api_id: response[i].id,
                            name: response[i].username,
                            email: response[i].email,
                            password: Math.random().toString(36).slice(-8),
                            orgModelId: id
                        });
                    }
                }
                logger.debug({
                    message: 'Will create following users',
                    usersToCreate,
                    options,
                    functionName: 'syncVendUsers'
                });
                return Promise.map(usersToCreate, function (eachUser) {
                    return SyncModel.app.models.UserModel.findOrCreate({
                        where: {
                            orgModelId: id,
                            or: [
                                {api_id: eachUser.api_id},
                                {email: eachUser.email}
                            ]
                        }
                    }, eachUser);
                });
            })
            .catch(function (error) {
                logger.error({
                    message: 'Could not save users to DB',
                    error,
                    options,
                    functionName: 'syncVendUsers'
                });
                return Promise.reject('Could not save users to DB');
            })
            .then(function (response) {
                usersCreated = response;
                logger.debug({
                    message: 'Saved users to db',
                    usersCreated,
                    options,
                    functionName: 'syncVendUsers'
                });
                return Promise.map(usersCreated, function (eachUserCreated) {
                    if (eachUserCreated[1]) { //findOrCreate returns array of arrays with object and boolean
                        return SyncModel.app.models.UserModel.assignRoles(eachUserCreated[0].id, ['storeManager']);
                    }
                    else {
                        return Promise.resolve('User not created');
                    }
                });
            })
            .catch(function (error) {
                logger.error({
                    message: 'Could not assign store manager roles to users',
                    error,
                    reason: error,
                    functionName: 'syncVendUsers',
                    options
                });
                return Promise.reject('Could not save users to DB');
            })
            .then(function (response) {
                logger.debug({
                    message: 'Created user roles as store manager, will assign store models to them',
                    response,
                    functionName: 'syncVendUsers',
                    options
                });
                return SyncModel.assignStoresToVendUsers(id, vendUsers, usersCreated, options);
            })
            .catch(function (error) {
                logger.error({
                    message: 'Could not assign stores to users, will move on anyway',
                    error,
                    reason: error,
                    functionName: 'syncVendUsers',
                    options
                });
                return Promise.resolve();
            });
    };

    SyncModel.assignStoresToVendUsers = function (orgModelId, vendUsers, usersCreated, options) {
        logger.debug({
            message: 'Will find store models and assign them to users',
            vendUsers,
            functionName: 'assignStoresToVendUsers',
            options
        });
        return SyncModel.app.models.StoreModel.find({
            where: {
                orgModelId: orgModelId
            }
        })
            .then(function (storeModelInstances) {
                logger.debug({
                    message: 'Found these store model instances, will assign to users',
                    storeModelInstances,
                    functionName: 'assignStoresToVendUsers',
                    options
                });
                return Promise.map(usersCreated, function (eachUserCreated) {
                    if (eachUserCreated[1]) {
                        var storeIdsToAssign = _.chain(storeModelInstances).filter(function (eachStoreModel) {
                            var restricted_outlet_ids = _.findWhere(vendUsers, {id: eachUserCreated[0].api_id}).restricted_outlet_ids;
                            return restricted_outlet_ids.indexOf(eachStoreModel.storeNumber) !== -1;
                        }).pluck('objectId').value();
                        if (!storeIdsToAssign.length) {
                            storeIdsToAssign = _.pluck(storeModelInstances, 'objectId');
                        }
                        logger.debug({
                            message: 'Will assign following store Ids to this user',
                            user: eachUserCreated[0],
                            storeIdsToAssign,
                            functionName: 'assignStoresToVendUsers',
                            options
                        });
                        return SyncModel.app.models.UserModel.assignStoreModelsToUser(orgModelId, eachUserCreated[0].id, storeIdsToAssign, options);
                    }
                    else {
                        return Promise.resolve('User not created');
                    }
                });
            })
            .catch(function (error) {
                logger.error({
                    message: 'Could not assign stores to user',
                    error,
                    reason: error,
                    functionName: 'assignStoresToVendUsers',
                    options
                });
                return Promise.reject('Could not assign stores to user');
            });
    };

    SyncModel.syncVendProductTypes = function (id, options) {
        logger.debug({
            message: 'Will sync vend product types',
            functionName: 'syncVendProductTypes',
            options
        });
        var vendUtils = require('./../../common/utils/vend')({OrgModel: SyncModel.app.models.OrgModel});
        return vendUtils.getVendProductTypes(id, options)
            .catch(function (error) {
                logger.error({
                    message: 'Could not fetch vend product types',
                    error,
                    functionName: 'syncVendProductTypes',
                    options
                });
            })
            .then(function (response) {
                logger.debug({
                    message: 'Fetched vend product types, will save to db',
                    response,
                    functionName: 'syncVendProductTypes',
                    options
                });
                if (response && response.data && response.data.length) {
                    return Promise.map(response.data, function (eachProductType) {
                        if (eachProductType.name && eachProductType.deleted_at !== 'null') {
                            return SyncModel.app.models.CategoryModel.findOrCreate({
                                where: {
                                    api_id: eachProductType.id,
                                    orgModelId: id
                                }
                            }, {
                                api_id: eachProductType.id,
                                name: eachProductType.name,
                                orgModelId: id
                            });
                        }
                    });
                }
                else {
                    logger.error({
                        message: 'Could not fetch any product types from vend',
                        options,
                        functionName: 'syncVendProductTypes'
                    });
                    return Promise.reject('Could not fetch any stores from vend');
                }
            })
            .catch(function (error) {
                logger.error({
                    message: 'Could not save product types to db',
                    error,
                    reason: error,
                    options,
                    functionName: 'syncVendProductTypes'
                });
                return Promise.reject('Could not save stores to db');
            })
            .then(function (response) {
                logger.debug({
                    message: 'Saved product types to db as categories',
                    response,
                    options,
                    functionName: 'syncVendProductTypes'
                });
                return Promise.resolve('Saved product types to db as categories');
            });
    };
};
