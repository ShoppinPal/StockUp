'use strict';

var Promise = require('bluebird');
const path = require('path');
const fileName = path.basename(__filename, '.js'); // gives the filename without the .js extension
const logger = require('sp-json-logger')({fileName: 'common:models:' + fileName});
var _ = require('underscore');
var Joi = Promise.promisifyAll(require('joi'));
var validate = Promise.promisify(require('joi').validate);
var vendSdk = require('vend-nodejs-sdk')({});
const rp = require('request-promise');
const sql = require('mssql');
const sse = require('../utils/sse');
module.exports = function (OrgModel) {


    OrgModel.on('dataSourceAttached', function (obj) {

        // wrap the whole model in Promise
        // but we need to avoid 'validate' method
        OrgModel = Promise.promisifyAll(
            OrgModel,
            {
                filter: function (name, func, target) {
                    return !( name == 'validate');
                }
            }
        );

        OrgModel.remoteMethod('fetchAuthorizationUrl', {
            accepts: [
                {arg: 'id', type: 'string', required: true},
                {arg: 'integrationType', type: 'string', required: true},
                {arg: 'options', type: 'object', http: 'optionsFromRequest'}
            ],
            http: {path: '/:id/fetchAuthorizationUrl', verb: 'get'},
            returns: {arg: 'authorizationUrl', type: 'string'}
        });

        OrgModel.fetchAuthorizationUrl = function (id, integrationType, options, cb) {
            logger.debug({
                message: 'Will fetch authorization Url for integrationType',
                integrationType,
                functionName: 'fetchAuthorizationUrl',
                options
            });
            return OrgModel.app.models.IntegrationModel.fetchAuthorizationUrl(integrationType, options)
                .catch(function (error) {
                    logger.error({
                        message: 'Error fetching authorization url for integration type',
                        integrationType,
                        functionName: 'fetchAuthorizationUrl',
                        options
                    });
                    return Promise.reject(error);
                });
        };

        OrgModel.remoteMethod('handleVendToken', {
            accepts: [
                {arg: 'code', type: 'string'},
                {arg: 'domain_prefix', type: 'string'},
                {arg: 'state', type: 'string'},
                {arg: 'error', type: 'string'},
            ],
            http: {path: '/handleVendToken', verb: 'get'},
            returns: {arg: 'token', type: 'string'}
        });

        //If someone changes this url, also remember to change it in Vend and IntegrationModel.fetchIntegrationUrl()
        OrgModel.handleVendToken = function (code, domainPrefix, state, error) {
            logger.debug({
                message: 'Received this token from Vend',
                code,
                domainPrefix,
                state,
                functionName: 'handleVendToken'
            });
            if (error) {
                logger.error({
                    err: error,
                    message: 'Error in oauth with vend',
                    functionName: 'handleVendToken'
                });
                return Promise.reject(error);
            }
            else {
                var vendConfig = OrgModel.app.get('integrations').vend;
                var vendToken;
                return vendSdk.getInitialAccessToken(
                    'https://' + domainPrefix + vendConfig.token_service,
                    vendConfig.client_id,
                    vendConfig.client_secret,
                    OrgModel.app.get('site').baseUrl + '/api/OrgModels/handleVendToken',
                    code,
                    domainPrefix,
                    state
                )
                    .catch(function (error) {
                        logger.error({
                            error,
                            message: 'Error in fetching access token from vend',
                            functionName: 'handleVendToken'
                        });
                        return Promise.reject(error);
                    })
                    .then(function (response) {
                        logger.debug({
                            message: 'Fetched access token and refresh token, will store in org model',
                            functionName: 'handleVendToken'
                        });
                        if (response && response.access_token) {
                            vendToken = response;
                            vendToken.type = 'vend';
                            logger.debug({
                                message: 'Looking for the user and org for access token stored in state param'
                            });
                            return OrgModel.app.models.AccessToken.findById(state);
                        }
                        else {
                            logger.error({
                                message: 'Some error in fetching access token',
                                functionName: 'handleVendToken'
                            });
                            return Promise.reject('Some error in fetching access token');
                        }
                    })
                    .catch(function (error) {
                        logger.error({
                            error,
                            message: 'Error in validating access token from state param',
                            functionName: 'handleVendToken'
                        });
                        return Promise.reject(error);
                    })
                    .then(function (accessToken) {
                        logger.debug({
                            message: 'Found access token current user',
                            accessToken,
                            functionName: 'handleVendToken'
                        });
                        return OrgModel.app.models.UserModel.findById(accessToken.userId);
                    })
                    .then(function (userModelInstance) {
                        logger.debug({
                            message: 'Found user from access token',
                            userModelInstance,
                            functionName: 'handleVendToken'
                        });
                        vendToken.orgModelId = userModelInstance.orgModelId;
                        return OrgModel.app.models.IntegrationModel.create(vendToken);
                    })
                    .catch(function (error) {
                        logger.error({
                            error,
                            message: 'Error in storing access token received from vend',
                            functionName: 'handleVendToken'
                        });
                        return Promise.reject(error);
                    });
            }
        };

        OrgModel.afterRemote('handleVendToken', function (context, remoteMethodOutput, next) {
            logger.debug({
                message: 'Handled vend token, now will redirect to connect POS/ERP page',
                functionName: 'handleVendToken:afterRemote'
            });
            context.res.redirect(301, '/v2/#/connect');
        });

        OrgModel.remoteMethod('handleMSDToken', {
            accepts: [
                {arg: 'code', type: 'string'},
                {arg: 'session_state', type: 'string'},
                {arg: 'state', type: 'string'},
                {arg: 'error', type: 'string'},
                {arg: 'error_description', type: 'string'}
            ],
            http: {path: '/handleMSDToken', verb: 'get'},
            returns: {arg: 'token', type: 'string'}
        });
        //If someone changes this url, also remember to change it in MSD and IntegrationModel.fetchIntegrationUrl()
        OrgModel.afterRemote('handleMSDToken', function (context, remoteMethodOutput, next) {
            logger.debug({
                message: 'Handled MSD token, now will redirect to connect POS/ERP page',
                functionName: 'handleMSDToken:afterRemote'
            });
            context.res.redirect(301, '/v2/#/connect');
        });

        //If someone changes this url, also remember to change it in MSD and IntegrationModel.fetchIntegrationUrl()
        OrgModel.handleMSDToken = function (code, sessionState, state, error, errorDescription) {
            logger.debug({
                message: 'Received this token from MSD',
                code,
                sessionState,
                state,
                functionName: 'handleMSDToken'
            });
            if (error) {
                return Promise.reject({
                    error: error,
                    errorDescription: errorDescription
                });
            }
            else {
                var msdConfig = OrgModel.app.get('integrations').msDynamics;
                var msdToken;
                return rp({
                    method: 'POST',
                    uri: msdConfig.token_endpoint,
                    form: {
                        grant_type: 'authorization_code',
                        client_id: msdConfig.client_id,
                        code: code,
                        redirect_uri: OrgModel.app.get('site').baseUrl + '/api/OrgModels/handleMSDToken',
                        client_secret: msdConfig.client_secret,
                        resource: 'https://lmmyuat.sandbox.operations.dynamics.com/'
                    }
                })
                    .then(function (response) {
                        logger.debug({
                            message: 'Fetched access token and refresh token, will store in org model',
                            response: JSON.parse(response),
                            functionName: 'handleMSDToken'
                        });
                        response = JSON.parse(response);
                        if (response && response.access_token) {
                            msdToken = response;
                            msdToken.type = 'msdynamics';
                            logger.debug({
                                message: 'Looking for the user and org for access token stored in state param',
                                functionName: 'handleMSDToken'
                            });
                            return OrgModel.app.models.AccessToken.findById(state);
                        }
                        else {
                            logger.error({
                                message: 'Some error in fetching access token',
                                functionName: 'handleMSDToken'
                            });
                            return Promise.reject('Some error in fetching access token');
                        }
                    }, function (error) {
                        logger.error({
                            error: JSON.stringify(error),
                            message: 'Error in fetching access token from MSD',
                            functionName: 'handleMSDToken'
                        });
                        return Promise.reject(error);
                    })
                    .catch(function (error) {
                        logger.error({
                            error,
                            message: 'Error in validating access token from state param',
                            functionName: 'handleMSDToken'
                        });
                        return Promise.reject(error);
                    })
                    .then(function (accessToken) {
                        logger.debug({
                            message: 'Found access token current user',
                            accessToken,
                            functionName: 'handleMSDToken'
                        });
                        return OrgModel.app.models.UserModel.findById(accessToken.userId);
                    })
                    .then(function (userModelInstance) {
                        logger.debug({
                            message: 'Found user from access token',
                            userModelInstance,
                            functionName: 'handleMSDToken'
                        });
                        msdToken.orgModelId = userModelInstance.orgModelId;
                        msdToken.expires_on = 0;
                        return OrgModel.app.models.IntegrationModel.create(msdToken);
                    })
                    .catch(function (error) {
                        logger.error({
                            error,
                            message: 'Error in storing access token received from MSD',
                            functionName: 'handleMSDToken'
                        });
                        return Promise.reject(error);
                    })
                    .then(function (result) {
                        logger.debug({
                            message: 'Created integration model, will look for companies in MSD',
                            result,
                            functionName: 'handleMSDToken'
                        });
                        var MSDUtil = require('./../utils/msd')({GlobalOrgModel: OrgModel});
                        return MSDUtil.fetchMSDData(msdToken.orgModelId, 'DimAttributeCompanyInfos');
                    })
                    .catch(function (error) {
                        logger.error({
                            error,
                            message: 'Could not fetch companies from MSD',
                            functionName: 'handleMSDToken'
                        });
                        return Promise.reject('Could not fetch companies from MSD');
                    })
                    .then(function (companyData) {
                        logger.debug({
                            message: 'Found company data',
                            companyData,
                            functionName: 'handleMSDToken'
                        });
                        for (var i = 0; i<companyData.value.length; i++) {
                            companyData.value[i] = {
                                name: companyData.value[i].Name,
                                value: companyData.value[i].Value
                            }
                        }
                        return OrgModel.app.models.IntegrationModel.updateAll({
                            orgModelId: msdToken.orgModelId
                        }, {
                            companies: companyData.value
                        });
                    })
                    .catch(function (error) {
                        logger.error({
                            message: 'Could not save company data into DB',
                            error,
                            functionName: 'handleMSDToken'
                        });
                        return Promise.reject('Could not save company data into DB');
                    });
            }
        };

        OrgModel.remoteMethod('initiateVendSync', {
            accepts: [
                {arg: 'id', type: 'string', required: true},
                {arg: 'options', type: 'object', http: 'optionsFromRequest'}
            ],
            http: {path: '/:id/initiateVendSync', verb: 'get'},
            returns: {arg: 'syncStatus', type: 'boolean'}
        });

        OrgModel.initiateVendSync = function (id, options, cb) {
            logger.debug({
                message: 'Will initiate sync for vend',
                options,
                functionName: 'initiateVendSync'
            });
            return OrgModel.app.models.SyncModel.initiateVendSync(id, options)
                .catch(function (error) {
                    logger.error({
                        message: 'Could not initiate vend sync',
                        error
                    });
                    return Promise.reject('Could not initiate vend sync');
                });
        };

        OrgModel.remoteMethod('initiateMSDSync', {
            accepts: [
                {arg: 'id', type: 'string', required: true},
                {arg: 'options', type: 'object', http: 'optionsFromRequest'}
            ],
            http: {path: '/:id/initiateMSDSync', verb: 'get'},
            returns: {arg: 'syncStatus', type: 'boolean'}
        });

        OrgModel.initiateMSDSync = function (id, options, cb) {
            logger.debug({
                message: 'Will initiate sync for msd',
                options,
                functionName: 'initiateMSDSync'
            });
            return OrgModel.app.models.SyncModel.initiateMSDSync(id, options)
                .catch(function (error) {
                    logger.error({
                        message: 'Could not initiate msd sync',
                        error
                    });
                    return Promise.reject('Could not initiate msd sync');
                });
        };

        OrgModel.remoteMethod('validateMSSQLDatabase', {
            accepts: [
                {arg: 'id', type: 'string', required: true},
                {arg: 'databaseName', type: 'string', required: true},
                {arg: 'options', type: 'object', http: 'optionsFromRequest'}
            ],
            http: {path: '/:id/validateMSSQLDatabase', verb: 'get'},
            returns: {arg: 'success', type: 'object', root: true}
        });

        OrgModel.validateMSSQLDatabase = function (id, databaseName, options) {
            logger.debug({
                message: 'Will close any existing sql connections',
                functionName: 'validateMSSQLDatabase',
                options
            });
            const sqlConfig = {
                user: OrgModel.app.get('sql').user,
                password: OrgModel.app.get('sql').password,
                server: OrgModel.app.get('sql').server, // You can use 'localhost\\instance' to connect to named instance
                database: databaseName,
                options: {
                    encrypt: true // Use this if you're on Windows Azure
                }
            };
            return Promise.resolve()
                .then(function () {
                    if (sql) {
                        return sql.close();
                    }
                    else
                        return Promise.resolve();
                })
                .then(function (res) {
                    logger.debug({
                        databaseName,
                        message: 'Closed present sql connections, will try connecting to given database',
                        options,
                        sqlConfig,
                        functionName: 'validateMSSQLDatabase'
                    });
                    return sql.connect(sqlConfig);
                })
                .then(function (res) {
                    logger.debug({
                        message: 'Database connected successfully, will update in Integration Model',
                        functionName: 'validateMSSQLDatabase',
                        options
                    });
                    return OrgModel.app.models.IntegrationModel.updateAll({
                        orgModelId: id
                    }, {
                        databaseValid: true,
                        databaseName: databaseName
                    });
                })
                .then(function (res) {
                    logger.debug({
                        message: 'Database valid flag updated in Integration Model',
                        res,
                        functionName: 'validateMSSQLDatabase',
                        options
                    });
                    return Promise.resolve({success: true});
                })
                .catch(function (err) {
                    logger.error({
                        message: 'Database not found',
                        err,
                        functionName: 'validateMSSQLDatabase',
                        options
                    });
                    return Promise.reject({success: false});
                });
        };

        OrgModel.remoteMethod('stopMSDSync', {
            accepts: [
                {arg: 'id', type: 'string', required: true},
                {arg: 'options', type: 'object', http: 'optionsFromRequest'}
            ],
            http: {path: '/:id/stopMSDSync', verb: 'get'},
            returns: {arg: 'status', type: 'boolean'}
        });

        OrgModel.stopMSDSync = function (id, options, cb) {
            logger.debug({
                message: 'Will stop sync for msd',
                options,
                functionName: 'stopMSDSync'
            });
            return OrgModel.app.models.SyncModel.stopMSDSync(id, options)
                .catch(function (error) {
                    logger.error({
                        message: 'Could not stop msd sync',
                        error
                    });
                    return Promise.reject('Could not stop msd sync');
                });
        };

        OrgModel.remoteMethod('syncMSDUsers', {
            accepts: [
                {arg: 'id', type: 'string', required: true},
                {arg: 'options', type: 'object', http: 'optionsFromRequest'}
            ],
            http: {path: '/:id/syncMSDUsers', verb: 'get'},
            returns: {arg: 'status', type: 'boolean'}
        });

        OrgModel.syncMSDUsers = function (id, options, cb) {
            logger.debug({
                message: 'Will sync MSD users',
                options,
                functionName: 'syncMSDUsers'
            });
            return OrgModel.app.models.SyncModel.syncMSDUsers(id, options)
                .catch(function (error) {
                    logger.error({
                        message: 'Could not sync MSD users',
                        error
                    });
                    return Promise.reject('Could not sync MSD users');
                });
        };

        OrgModel.remoteMethod('syncMSDStores', {
            accepts: [
                {arg: 'id', type: 'string', required: true},
                {arg: 'options', type: 'object', http: 'optionsFromRequest'}
            ],
            http: {path: '/:id/syncMSDStores', verb: 'get'},
            returns: {arg: 'status', type: 'boolean'}
        });

        OrgModel.syncMSDStores = function (id, options, cb) {
            logger.debug({
                message: 'Will sync MSD stores',
                options,
                functionName: 'syncMSDStores'
            });
            return OrgModel.app.models.SyncModel.syncMSDStores(id, options)
                .catch(function (error) {
                    logger.error({
                        message: 'Could not sync MSD stores',
                        error
                    });
                    return Promise.reject('Could not sync MSD stores');
                });
        };

        OrgModel.remoteMethod('syncMSDCategories', {
            accepts: [
                {arg: 'id', type: 'string', required: true},
                {arg: 'options', type: 'object', http: 'optionsFromRequest'}
            ],
            http: {path: '/:id/syncMSDCategories', verb: 'get'},
            returns: {arg: 'status', type: 'boolean'}
        });

        OrgModel.syncMSDCategories = function (id, options, cb) {
            logger.debug({
                message: 'Will sync MSD categories',
                options,
                functionName: 'syncMSDCategories'
            });
            return OrgModel.app.models.SyncModel.syncMSDCategories(id, options)
                .catch(function (error) {
                    logger.error({
                        message: 'Could not sync MSD categories',
                        error
                    });
                    return Promise.reject('Could not sync MSD categories');
                });
        };


        OrgModel.remoteMethod('updateBinLocation', {
            accepts: [
                {arg: 'id', type: 'string', required: true},
                {arg: 'productId', type: 'string', required: true},
                {arg: 'binLocation', type: 'string', required: true},
                {arg: 'options', type: 'object', http: 'optionsFromRequest'}
            ],
            http: {path: '/:id/updateBinLocation', verb: 'post'},
            returns: {arg: 'product', type: 'object'}
        });

        OrgModel.updateBinLocation = function (id, productId, binLocation, options) {
            return OrgModel.app.models.ProductModel.updateBinLocation(id, productId, binLocation, options)
                .catch(function (error) {
                    logger.error({
                        error,
                        message: 'Could not update bin location',
                        functionName: 'updateBinLocation',
                        options
                    });
                    return Promise.reject('Could not update bin location');
                });
        };

        OrgModel.remoteMethod('uploadMinMaxFile', {
            accepts: [
                {arg: 'id', type: 'string', required: true},
                {arg: 'req', type: 'object', 'http': {source: 'req'}},
                {arg: 'options', type: 'object', http: 'optionsFromRequest'}
            ],
            http: {path: '/:id/uploadMinMaxFile', verb: 'post'},
            returns: {arg: 'result', type: 'string'}
        });

        OrgModel.uploadMinMaxFile = function (id, req, options, cb) {
            logger.debug({
                message: 'Will upload min max file for categories',
                functionName: 'uploadMinMaxFile',
                options
            });
            return OrgModel.app.models.CategoryModel.uploadMinMaxFile(id, req, options)
                .catch(function (error) {
                    logger.debug({
                        message: 'Error processing min max file',
                        error,
                        functionName: 'uploadMinMaxFile',
                        options
                    });
                    return Promise.reject(false);
                })
        };

        OrgModel.remoteMethod('generateStockOrderMSD', {
            accepts: [
                {arg: 'id', type: 'string', required: true},
                {arg: 'storeModelId', type: 'string', required: true},
                {arg: 'warehouseModelId', type: 'string', required: true},
                {arg: 'req', type: 'object', 'http': {source: 'req'}},
                {arg: 'res', type: 'object', 'http': {source: 'res'}},
                {arg: 'categoryModelId', type: 'string'},
                {arg: 'options', type: 'object', http: 'optionsFromRequest'}
            ],
            http: {path: '/:id/generateStockOrderMSD', verb: 'get'},
            returns: {arg: 'data', type: 'ReadableStream', root: true}
        });

        OrgModel.generateStockOrderMSD = function (id, storeModelId, warehouseModelId, req, res, categoryModelId, options) {
            try {
                sse.setupSSE(req,res, options);
            }
            catch (e) {
                logger.error({
                    e,
                    options,
                    message: 'Error creating SSE',
                    functionName: 'generateStockOrderMSD'
                });
            }
            OrgModel.app.models.ReportModel.generateStockOrderMSD(id, storeModelId, warehouseModelId, categoryModelId, options)
                .catch(function (error) {
                    logger.error({
                        error,
                        message: 'Could not initiate stock order generation',
                        functionName: 'generateStockOrderMSD',
                        options
                    });
                    return Promise.reject('Could not initiate stock order generation');
                });
        };

        OrgModel.remoteMethod('generateStockOrderVend', {
            accepts: [
                {arg: 'id', type: 'string', required: true},
                {arg: 'storeModelId', type: 'string', required: true},
                {arg: 'supplierModelId', type: 'string', required: true},
                {arg: 'name', type: 'string'},
                {arg: 'warehouseModelId', type: 'string', required: true},
                {arg: 'req', type: 'object', 'http': {source: 'req'}},
                {arg: 'res', type: 'object', 'http': {source: 'res'}},
                {arg: 'options', type: 'object', http: 'optionsFromRequest'}
            ],
            http: {path: '/:id/generateStockOrderVend', verb: 'get'},
            returns: {arg: 'data', type: 'ReadableStream', root: true}
        });

        OrgModel.generateStockOrderVend = function (id, storeModelId, supplierModelId, name, warehouseModelId, req, res, options) {
            try {
                sse.setupSSE(req,res, options);
            }
            catch (e) {
                logger.error({
                    e,
                    options,
                    message: 'Error creating SSE',
                    functionName: 'generateStockOrderVend'
                });
            }
            OrgModel.app.models.ReportModel.generateStockOrderVend(id, storeModelId, supplierModelId, name, warehouseModelId, options)
                .catch(function (error) {
                    logger.error({
                        error,
                        message: 'Could not initiate stock order generation',
                        functionName: 'generateStockOrderVend',
                        options
                    });
                    return Promise.reject('Could not initiate stock order generation');
                });
        };

        OrgModel.remoteMethod('receiveConsignment', {
            accepts: [
                {arg: 'id', type: 'string', required: true},
                {arg: 'reportModelId', type: 'string', required: true},
                {arg: 'req', type: 'object', 'http': {source: 'req'}},
                {arg: 'res', type: 'object', 'http': {source: 'res'}},
                {arg: 'options', type: 'object', http: 'optionsFromRequest'}
            ],
            http: {path: '/:id/receiveConsignment', verb: 'get'},
            returns: {arg: 'data', type: 'ReadableStream', root: true}
        });

        OrgModel.receiveConsignment = function (id, reportModelId, req, res, options) {
            try {
                sse.setupSSE(req,res, options);
            }
            catch (e) {
                logger.error({
                    e,
                    options,
                    message: 'Error creating SSE',
                    functionName: 'receiveConsignment'
                });
            }
            OrgModel.app.models.ReportModel.receiveConsignment(id, reportModelId, options)
                .catch(function (error) {
                    logger.error({
                        error,
                        message: 'Could not initiate stock order receiving',
                        functionName: 'receiveConsignment',
                        options
                    });
                    return Promise.reject('Could not initiate stock order receiving');
                });
        };


        OrgModel.remoteMethod('sendWorkerStatus', {
            accepts: [
                {arg: 'id', type: 'string', required: true},
                {arg: 'userId', type: 'string', required: true},
                {arg: 'data', type: 'object'},
                {arg: 'messageId', type: 'string', required: true},
                {arg: 'options', type: 'object', http: 'optionsFromRequest'}
            ],
            http: {path: '/:id/sendWorkerStatus', verb: 'post'},
            returns: {arg: 'data', type: 'object', root: true}
        });

        OrgModel.sendWorkerStatus = function (id, userId, data, messageId, options, cb) {
            try {
                logger.debug({
                    options,
                    message: 'This is called by worker',
                    userId,
                    data,
                    messageId,
                    functionName: 'sendWorkerStatus'
                });
                var sseInstance = sse.getSSE(userId);
                sseInstance.send(Object.assign({}, {messageId}, data), '', messageId);
                cb(null, true);
            }
            catch (e) {
                logger.error({
                    options,
                    err: e,
                    message: 'Could not send data to client',
                    functionName: 'sendReports'
                });
                cb(e);
            }
        };

        OrgModel.remoteMethod('createTransferOrderMSD', {
            accepts: [
                {arg: 'id', type: 'string', required: true},
                {arg: 'reportModelId', type: 'string', required: true},
                {arg: 'req', type: 'object', 'http': {source: 'req'}},
                {arg: 'res', type: 'object', 'http': {source: 'res'}},
                {arg: 'options', type: 'object', http: 'optionsFromRequest'}
            ],
            http: {path: '/:id/createTransferOrderMSD', verb: 'GET'},
            returns: {arg: 'data', type: 'ReadableStream', root: true}
        });

        OrgModel.createTransferOrderMSD = function (id, reportModelId, req, res, options, cb) {
            logger.debug({
                message: 'Will create transfer order in MSD',
                reportModelId,
                options,
                functionName: 'createTransferOrderMSD'
            });
            sse.setupSSE(req,res, options);
            OrgModel.app.models.ReportModel.createTransferOrderMSD(id, reportModelId, options)
                .catch(function (error) {
                    logger.error({
                        message: 'Could not create transfer order in MSD',
                        reportModelId,
                        options,
                        functionName: 'createTransferOrderMSD',
                        error
                    });
                    sse.getSSE(options.accessToken.userId).send(false);
                });
        };

        OrgModel.remoteMethod('updateAllStockOrderLineItemModels', {
            accepts: [
                {arg: 'id', type: 'string', required: true},
                {arg: 'reportModelId', type: 'string', required: true},
                {arg: 'lineItemIds', type: 'array', required: true},
                {arg: 'data', type: 'object', required: true},
                {arg: 'options', type: 'object', http: 'optionsFromRequest'}
            ],
            http: {path: '/:id/updateAllStockOrderLineItemModels', verb: 'POST'},
            returns: {arg: 'status', type: 'object', root: true}
        });

        OrgModel.updateAllStockOrderLineItemModels = function (id, reportModelId, lineItemIds, data, options, cb) {
            logger.debug({
                message: 'Will update these line items for order',
                data,
                lineItemIds,
                options,
                functionName: 'updateAllStockOrderLineItemModels'
            });
            var filter = {
                orgModelId: id,
                reportModelId: reportModelId
            };
            if (lineItemIds.length) {
                filter.id = {
                    inq: lineItemIds
                };
            }
            return OrgModel.app.models.StockOrderLineitemModel.updateAll(filter, data)
                .catch(function (error) {
                    logger.error({
                        message: 'Could not update these line items',
                        lineItemIds,
                        options,
                        functionName: 'updateAllStockOrderLineItemModels',
                        error
                    });
                    return Promise.reject('Could not update stock order line items');
                });
        };

        OrgModel.remoteMethod('syncVendStores', {
            accepts: [
                {arg: 'id', type: 'string', required: true},
                {arg: 'options', type: 'object', http: 'optionsFromRequest'}
            ],
            http: {path: '/:id/syncVendStores', verb: 'get'},
            returns: {arg: 'outlets', type: 'array', root: true}
        });

        OrgModel.syncVendStores = function (id, options, cb) {
            logger.debug({
                message: 'Will sync Vend stores',
                options,
                functionName: 'syncVendStores'
            });
            return OrgModel.app.models.SyncModel.syncVendStores(id, options)
                .catch(function (error) {
                    logger.error({
                        message: 'Could not sync vend outlets',
                        error,
                        functionName: 'syncVendStores',
                        options
                    });
                    return Promise.reject('Could not sync vend outlets');
                });
        };

        OrgModel.remoteMethod('syncVendUsers', {
            accepts: [
                {arg: 'id', type: 'string', required: true},
                {arg: 'options', type: 'object', http: 'optionsFromRequest'}
            ],
            http: {path: '/:id/syncVendUsers', verb: 'get'},
            returns: {arg: 'users', type: 'array', root: true}
        });

        OrgModel.syncVendUsers = function (id, options, cb) {
            logger.debug({
                message: 'Will sync Vend stores',
                options,
                functionName: 'syncVendUsers'
            });
            return OrgModel.app.models.SyncModel.syncVendUsers(id, options)
                .catch(function (error) {
                    logger.error({
                        message: 'Could not sync vend users',
                        error,
                        functionName: 'syncVendUsers',
                        options
                    });
                    return Promise.reject('Could not sync vend users');
                });
        };

        OrgModel.remoteMethod('inviteUser', {
            accepts: [
                {arg: 'id', type: 'string', required: true},
                {arg: 'userId', type: 'string', required: true},
                {arg: 'options', type: 'object', http: 'optionsFromRequest'}
            ],
            http: {path: '/:id/inviteUser', verb: 'post'},
            returns: {arg: 'status', type: 'boolean', root: true}
        });

        OrgModel.inviteUser = function (id, userId, options) {
            return OrgModel.app.models.UserModel.inviteUser(id, userId, options)
                .catch(function (error) {
                    logger.error({
                        message: 'Could not invite user to StockUp',
                        error,
                        functionName: 'inviteUser',
                        options
                    });
                    return Promise.reject('Could not invite user to StockUp');
                });
        };

        OrgModel.remoteMethod('fetchOrderRowCounts', {
            accepts: [
                {arg: 'id', type: 'string', required: true},
                {arg: 'orderIds', type: 'array', required: true},
                {arg: 'options', type: 'object', http: 'optionsFromRequest'}
            ],
            http: {path: '/:id/fetchOrderRowCounts', verb: 'GET'},
            returns: {arg: 'rowCounts', type: 'object', root: true}
        });
        OrgModel.fetchOrderRowCounts = function (id, orderIds, options) {
            return OrgModel.app.models.ReportModel.fetchOrderRowCounts(orderIds, options)
                .catch(function (error) {
                    logger.error({
                        error,
                        options,
                        functionName: 'fetchOrderRowCounts'
                    });
                    return Promise.reject(error);
                });
        };

        OrgModel.remoteMethod('downloadReportModelCSV', {
            accepts: [
                {arg: 'id', type: 'string', required: true},
                {arg: 'reportModelId', type: 'string', required: true},
                {arg: 'options', type: 'object', http: 'optionsFromRequest'}
            ],
            http: {path: '/:id/downloadReportModelCSV', verb: 'GET'},
            returns: {arg: 'csvReportUrl', type: 'string', root: true}
        });

        OrgModel.downloadReportModelCSV = function (id, reportModelId, options) {
            return OrgModel.app.models.ReportModel.downloadReportModelCSV(id, reportModelId, options)
                .catch(function (error) {
                    logger.error({
                        error,
                        options,
                        functionName: 'downloadReportModelCSV'
                    });
                    return Promise.reject(error);
                });
        };

        OrgModel.remoteMethod('setReportStatus', {
            accepts: [
                {arg: 'id', type: 'string', required: true},
                {arg: 'reportModelId', type: 'string', required: true},
                {arg: 'to', type: 'string', required: true},
                {arg: 'options', type: 'object', http: 'optionsFromRequest'}
            ],
            http: {path: '/:id/setReportStatus', verb: 'put'},
            returns: {arg: 'updatedReportModelInstance', type: 'object', root: true}
        });

        OrgModel.setReportStatus = function (id, reportModelId, to, options) {
            return OrgModel.app.models.ReportModel.setReportStatus(id, reportModelId, to, options)
                .catch(function (error) {
                    logger.error({
                        error,
                        options,
                        functionName: 'setReportStatus'
                    });
                    return Promise.reject(error);
                });
        };

        OrgModel.remoteMethod('updateOrgSettings', {
            accepts: [
                {arg: 'id', type: 'string', required: true},
                {arg: 'data', type: 'object', required: true},
                {arg: 'options', type: 'object', http: 'optionsFromRequest'}
            ],
            http: {path: '/:id/updateOrgSettings', verb: 'GET'},
            returns: {arg: 'data', type: 'object', root: true}
        });

        OrgModel.updateOrgSettings = function (id, data, options) {
            return OrgModel.updateAll({
                id: id
            }, data)
                .catch(function (error) {
                    logger.error({
                        error,
                        options,
                        functionName: 'updateOrgSettings'
                    });
                    return Promise.reject(error);
                });
        };

        OrgModel.remoteMethod('createPurchaseOrderVend', {
            accepts: [
                {arg: 'id', type: 'string', required: true},
                {arg: 'reportModelId', type: 'string', required: true},
                {arg: 'req', type: 'object', 'http': {source: 'req'}},
                {arg: 'res', type: 'object', 'http': {source: 'res'}},
                {arg: 'options', type: 'object', http: 'optionsFromRequest'}
            ],
            http: {path: '/:id/createPurchaseOrderVend', verb: 'GET'},
            returns: {arg: 'data', type: 'ReadableStream', root: true}
        });

        OrgModel.createPurchaseOrderVend = function (id, reportModelId, req, res, options) {
            logger.debug({
                message: 'Will create purchase order in Vend',
                reportModelId,
                options,
                functionName: 'createPurchaseOrderVend'
            });
            res.connection.setTimeout(0);
            sse.setupSSE(req,res, options);
            OrgModel.app.models.ReportModel.createPurchaseOrderVend(id, reportModelId, options)
                .catch(function (error) {
                    logger.error({
                        message: 'Could not create purchase order in Vend',
                        reportModelId,
                        options,
                        functionName: 'createPurchaseOrderVend',
                        error
                    });
                    sse.getSSE(options.accessToken.userId).send(false);
                });
        };

        OrgModel.remoteMethod('assignRoles', {
            accepts: [
                {arg: 'id', type: 'string', required: true},
                {arg: 'userId', type: 'string', required: true},
                {arg: 'roles', type: 'array', required: true},
                {arg: 'options', type: 'object', http: 'optionsFromRequest'}
            ],
            http: {path: '/:id/assignRoles', verb: 'POST'},
            returns: {arg: 'roles', type: 'object', root: true}
        });

        OrgModel.assignRoles = function (id, userId, roles, options) {
            return OrgModel.app.models.UserModel.assignRoles(userId, roles)
                .catch(function (error) {
                    logger.error({
                        error,
                        reason: error,
                        message: 'Could not assign roles to user',
                        userId,
                        functionName: 'assignRoles',
                        options
                    });
                    return Promise.reject('Could not assign roles to user');
                });
        };

        OrgModel.remoteMethod('assignStoreModelsToUser', {
            accepts: [
                {arg: 'id', type: 'string', required: true},
                {arg: 'userId', type: 'string', required: true},
                {arg: 'storeIds', type: 'array', required: true},
                {arg: 'options', type: 'object', http: 'optionsFromRequest'}
            ],
            http: {path: '/:id/assignStoreModelsToUser', verb: 'POST'},
            returns: {arg: 'status', type: 'boolean', root: true}
        });

        OrgModel.assignStoreModelsToUser = function (id, userId, storeIds, options) {
            return OrgModel.app.models.UserModel.assignStoreModelsToUser(id, userId, storeIds, options)
                .catch(function (error) {
                    logger.error({
                        error,
                        reason: error,
                        message: 'Could not assign stores to user',
                        userId,
                        functionName: 'assignStoreModelsToUser',
                        options
                    });
                    return Promise.reject(false);
                });
        };

        OrgModel.remoteMethod('sendConsignmentDelivery', {
            accepts: [
                {arg: 'id', type: 'string', required: true},
                {arg: 'reportModelId', type: 'string', required: true},
                {arg: 'options', type: 'object', http: 'optionsFromRequest'}
            ],
            http: {path: '/:id/sendConsignmentDelivery', verb: 'POST'},
            returns: {arg: 'status', type: 'boolean', root: true}
        });

        OrgModel.sendConsignmentDelivery = function (id, reportModelId, options) {
            return OrgModel.app.models.ReportModel.sendConsignmentDelivery(id, reportModelId, options)
                .catch(function (error) {
                    logger.error({
                        error,
                        reason: error,
                        message: 'Could not send consignment delivery',
                        userId,
                        functionName: 'sendConsignmentDelivery',
                        options
                    });
                    return Promise.reject(false);
                });
        };
    
        OrgModel.remoteMethod('scanBarcodeStockOrder', {
            accepts: [
                {arg: 'id', type: 'string', required: true},
                {arg: 'scanType', type: 'string', required: true},
                {arg: 'productSku', type: 'string', required: true},
                {arg: 'reportModelId', type: 'string', required: true},
                {arg: 'force', type: 'boolean', required: false},
                {arg: 'options', type: 'object', http: 'optionsFromRequest'}
            ],
            http: {path: '/:id/scanBarcodeStockOrder', verb: 'post'},
            returns: {arg: 'data', type: 'object', root: true}
        });
    
        OrgModel.scanBarcodeStockOrder = function (id, scanType, productSku, reportModelId, force, options) {
                logger.debug({
                    id, scanType, productSku, reportModelId, force, options,
                    message: 'StockOrder Scan to Process',
                    functionName: 'scanBarcodeStockOrder'
                });
                return OrgModel.app.models.StockOrderLineitemModel.scanBarcodeStockOrder(scanType, productSku, id,reportModelId, force, options);
        };

        OrgModel.remoteMethod('fetchFileImportHeaders', {
            accepts: [
                {arg: 'id', type: 'string', required: true},
                {arg: 'options', type: 'object', http: 'optionsFromRequest'}
            ],
            http: {path: '/:id/fetchImportHeaders', verb: 'GET'},
            returns: {arg: 'headers', type: 'object', root: true}
        });

        OrgModel.fetchFileImportHeaders = function (id, options) {
            return OrgModel.app.models.OrderConfigModel.fetchFileImportHeaders(id, options)
                .catch(function (error) {
                    logger.error({
                        error,
                        reason: error,
                        message: 'Could not fetch file import headers',
                        userId,
                        functionName: 'fetchFileImportHeaders',
                        options
                    });
                    return Promise.reject(false);
                });
        };

        OrgModel.remoteMethod('importVendOrderFromFile', {
            accepts: [
                {arg: 'id', type: 'string', required: true},
                {arg: 'req', type: 'object', 'http': {source: 'req'}},
                {arg: 'options', type: 'object', http: 'optionsFromRequest'}
            ],
            http: {path: '/:id/importVendOrderFromFile', verb: 'post'},
            returns: {arg: 'result', type: 'string'}
        });

        OrgModel.importVendOrderFromFile = function (id, req, options, cb) {
            logger.debug({
                message: 'Will import vend order from file',
                functionName: 'importVendOrderFromFile',
                options
            });
            return OrgModel.app.models.ReportModel.importVendOrderFromFile(id, req, options)
                .catch(function (error) {
                    logger.debug({
                        message: 'Error processing order file',
                        error,
                        functionName: 'importVendOrderFromFile',
                        options
                    });
                    return Promise.reject(false);
                });
        };

        OrgModel.remoteMethod('updateSupplierStoreMappings', {
            accepts: [
                {arg: 'id', type: 'string', required: true},
                {arg: 'mappings', type: 'array', required: true},
                {arg: 'options', type: 'object', http: 'optionsFromRequest'}
            ],
            http: {path: '/:id/updateSupplierStoreMappings', verb: 'post'},
            returns: {arg: 'result', type: 'string'}
        });

        OrgModel.updateSupplierStoreMappings = function (id, mappings, options) {
            logger.debug({
                message: 'Will update supplier store mappings',
                functionName: 'updateSupplierStoreMappings',
                options
            });
            return OrgModel.app.models.SupplierStoreMapping.updateSupplierStoreMappings(id, mappings, options)
                .catch(function (error) {
                    logger.debug({
                        message: 'Error updating mappings',
                        error,
                        functionName: 'updateSupplierStoreMappings',
                        options
                    });
                    return Promise.reject('Error updating mappings');
                });
        };


    });
};
