'use strict';

var Promise = require('bluebird');
const path = require('path');
const fileName = path.basename(__filename, '.js'); // gives the filename without the .js extension
const logger = require('sp-json-logger')({fileName: 'common:models:' + fileName});
var _ = require('underscore');
var Joi = Promise.promisifyAll(require('joi'));
var validate = Promise.promisify(require('joi').validate);
var vendSdk = require('vend-nodejs-sdk')({});

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
                {arg: 'code', type: 'string', required: true},
                {arg: 'domain_prefix', type: 'string'},
                {arg: 'state', type: 'string', required: true},
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
        OrgModel.handleMSDToken = function (code, sessionState, state, error, errorDescription) {
            logger.debug({
                message: 'Received this token from MSD',
                code,
                sessionState,
                state,
                functionName: 'handleVendToken'
            });
            if (error) {
                return Promise.reject({
                    error: error,
                    errorDescription: errorDescription
                });
            }
            else {
                if (code) {

                }
                return Promise.resolve();
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

        OrgModel.remoteMethod('updateBinLocation', {
            accepts: [
                {arg: 'id', type: 'string', required: true},
                {arg: 'productId', type: 'string', required: true},
                {arg: 'binLocation', type: 'string', required: true}
            ],
            http: {path: '/:id/updateBinLocation', verb: 'post'},
            returns: {arg: 'product', type: 'object'}
        });

        OrgModel.updateBinLocation = function (id, productId, binLocation, options) {
            return OrgModel.app.models.ProductModel.updateBinLocation(id, productId, binLocation, options)
                .catch(function (error) {
                    logger.error({
                        error,
                        message: 'Could not update bin location'
                    });
                    return Promise.reject('Could not update bin location');
                });
        }

    });
};
