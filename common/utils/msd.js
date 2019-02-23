'use strict';

var Promise = require('bluebird');
const path = require('path');
const fileName = path.basename(__filename, '.js'); // gives the filename without the .js extension
const logger = require('sp-json-logger')({fileName: 'common:models:' + fileName});
const rp = require('request-promise');
var GlobalOrgModel = null;

var refreshMSDToken = function (orgModelId, options) {
    logger.debug({
        message: 'Will refresh MSD token',
        orgModelId: orgModelId,
        functionName: 'refreshMSDToken'
    });
    var newAccessToken = null;
    return GlobalOrgModel.findById(orgModelId, {
        include: 'integrationModels'
    })
        .catch(function (error) {
            logger.error({
                message: 'Could not find orgModel',
                orgModelId,
                error,
                functionName: 'refreshMSDToken'
            });
            return Promise.reject('Could not find orgModel');
        })
        .then(function (orgModel) {
            logger.debug({
                message: 'Found this orgModel',
                orgModel,
                functionName: 'refreshMSDToken'
            });
            //remove trailing '/' in resource
            var resource = orgModel.integrationModels()[0].resource;
            resource = resource.endsWith('/') ? resource.substr(0, resource.length - 1) : resource;
            var options = {
                method: 'POST',
                uri: GlobalOrgModel.app.get('integrations').msDynamics.token_endpoint,
                form: {
                    client_id: GlobalOrgModel.app.get('integrations').msDynamics.client_id,
                    client_secret: GlobalOrgModel.app.get('integrations').msDynamics.client_secret,
                    grant_type: 'refresh_token',
                    refresh_token: orgModel.integrationModels()[0].refresh_token,
                    resource: resource
                },
                json: true
            };
            logger.debug({
                message: 'Will send the following request',
                options,
                functionName: 'refreshMSDToken'
            });
            return rp(options);
        })
        .catch(function (error) {
            logger.error({
                message: 'Could not fetch new MSD Token',
                requestError: error,
                orgModelId,
                functionName: 'refreshMSDToken'
            });
            return Promise.reject('Could not fetch new MSD Token');
        })
        .then(function (token) {
            logger.debug({
                message: 'Fetched new MSD access token',
                orgModelId,
                token,
                functionName: 'refreshMSDToken'
            });
            newAccessToken = token.access_token;
            return GlobalOrgModel.app.models.IntegrationModel.updateAll({
                orgModelId: orgModelId
            }, {
                access_token: token.access_token,
                refresh_token: token.refresh_token,
                expires_on: token.expires_on,
                not_before: token.not_before,
                updatedAt: new Date()
            });
        })
        .catch(function (error) {
            logger.error({
                message: 'Could not update refresh token for Org',
                error,
                orgModelId,
                functionName: 'refreshMSDToken'
            });
            return Promise.reject('Could not update refresh token for Org');
        })
        .then(function (result) {
            logger.debug({
                message: 'Updated org with new access token',
                result,
                orgModelId,
                functionName: 'refreshMSDToken'
            });
            return Promise.resolve(newAccessToken);
        });
};

var fetchMSDData = function (orgModelId, dataTable, companyIdentifierKey, options) {
    logger.debug({
        message: 'Will fetch the following data from msd',
        options,
        dataTable,
        functionName: 'fetchMSDData'
    });
    var orgModelInstance;

    return GlobalOrgModel.findById(orgModelId, {
        include: 'integrationModels'
    })
        .catch(function (error) {
            logger.error({
                message: 'Could not find orgModel',
                options,
                error,
                functionName: 'fetchMSDData'
            });
            return Promise.reject('Could not find orgModel');
        })
        .then(function (result) {
            orgModelInstance = result;
            logger.debug({
                message: 'Found this orgModel',
                orgModelInstance,
                functionName: 'fetchMSDData',
                options
            });

            if (orgModelInstance.integrationModels().length) {
                if (orgModelInstance.integrationModels()[0].expires_on<(Date.now() / 1000)) {
                    logger.debug({
                        message: 'Will refresh token first',
                        tokenExpiredOn: orgModelInstance.integrationModels()[0].expires_on,
                        functionName: 'fetchMSDData',
                        options
                    });
                    return refreshMSDToken(orgModelId);
                }
                else {
                    return Promise.resolve('tokenNotExpired');
                }
            }
            else {
                logger.error({
                    message: 'Could not find any integrations for the org',
                    options,
                    functionName: 'fetchMSDData'
                });
                return Promise.reject('Could not find any integrations for the org');
            }

        })
        .catch(function (error) {
            logger.error({
                error,
                message: 'Access token could not be refreshed',
                functionName: 'fetchMSDData',
                options
            });
            return Promise.reject('Access token could not be refreshed');
        })
        .then(function (token) {
            if (token !== 'tokenNotExpired') {
                logger.debug({
                    message: 'Will use the new token to fetch data from MSD',
                    token,
                    options,
                    functionName: 'fetchMSDData'
                });
            }
            else {
                token = orgModelInstance.integrationModels()[0].access_token;
            }
            let uri = orgModelInstance.integrationModels()[0].resource + 'data/' + dataTable;
            uri += '?cross-company=true';
            if (companyIdentifierKey)
                uri += '&$filter=' + companyIdentifierKey + ' eq \'' + orgModelInstance.integrationModels()[0].dataAreaId + '\'';
            var reqOptions = {
                method: 'GET',
                uri: uri,
                json: true,
                headers: {
                    'OData-MaxVersion': '4.0',
                    'OData-Version': '4.0',
                    'Content-Type': 'application/json;odata.metadata=minimal',
                    'Accept': 'application/json;odata.metadata=minimal',
                    'Accept-Charset': 'UTF-8',
                    'Authorization': orgModelInstance.integrationModels()[0].token_type + ' ' + token,
                    'Host': orgModelInstance.integrationModels()[0].resource.replace('https://', '').replace('http://', '').replace('/', '')
                }
            };
            logger.debug({
                message: 'Sending the following request to MSD',
                reqOptions,
                options,
                functionName: 'fetchMSDData'
            });
            return rp(reqOptions);
        })
        .catch(function (error) {
            logger.error({
                requestError: error,
                message: 'Could not fetch the data from MSD',
                orgModelId,
                dataTable,
                functionName: 'fetchMSDData'
            });
            return Promise.reject('Could not fetch the data from MSD');
        })
        .then(function (response) {
            logger.debug({
                message: 'Fetched data from MSD',
                numberOfObjects: response.value.length,
                functionName: 'fetchMSDData'
            });
            return Promise.resolve(response);
        });
};

var pushMSDData = function (orgModelId, dataTable, data, options) {
    logger.debug({
        message: 'Will push the following data to msd',
        options,
        dataTable,
        data,
        functionName: 'pushMSDData'
    });
    var orgModelInstance;

    return GlobalOrgModel.findById(orgModelId, {
        include: 'integrationModels'
    })
        .catch(function (error) {
            logger.error({
                message: 'Could not find orgModel',
                options,
                error,
                functionName: 'pushMSDData'
            });
            return Promise.reject('Could not find orgModel');
        })
        .then(function (result) {
            orgModelInstance = result;
            logger.debug({
                message: 'Found this orgModel',
                orgModelInstance,
                functionName: 'pushMSDData',
                options
            });

            if (orgModelInstance.integrationModels().length) {
                if (orgModelInstance.integrationModels()[0].expires_on<(Date.now() / 1000)) {
                    logger.debug({
                        message: 'Will refresh token first',
                        tokenExpiredOn: orgModelInstance.integrationModels()[0].expires_on,
                        functionName: 'fetchMSDData',
                        options
                    });
                    return refreshMSDToken(orgModelId);
                }
                else {
                    return Promise.resolve('tokenNotExpired');
                }
            }
            else {
                logger.error({
                    message: 'Could not find any integrations for the org',
                    orgModelId: id,
                    functionName: 'pushMSDData',
                    options
                });
                return Promise.reject('Could not find any integrations for the org');
            }

        })
        .catch(function (error) {
            logger.error({
                error,
                message: 'Access token could not be refreshed',
                functionName: 'pushMSDData',
                options
            });
            return Promise.reject('Access token could not be refreshed');
        })
        .then(function (token) {
            if (token !== 'tokenNotExpired') {
                logger.debug({
                    message: 'Will use the new token to fetch data from MSD',
                    token,
                    options,
                    functionName: 'pushMSDData'
                });
            }
            else {
                token = orgModelInstance.integrationModels()[0].access_token;
            }
            var requestOptions = {
                method: 'POST',
                uri: orgModelInstance.integrationModels()[0].resource + 'data/' + dataTable,
                json: true,
                headers: {
                    'OData-MaxVersion': '4.0',
                    'OData-Version': '4.0',
                    'Content-Type': 'application/json;odata.metadata=minimal',
                    'Accept': 'application/json;odata.metadata=minimal',
                    'Accept-Charset': 'UTF-8',
                    'Authorization': orgModelInstance.integrationModels()[0].token_type + ' ' + token,
                    'Host': orgModelInstance.integrationModels()[0].resource.replace('https://', '').replace('http://', '').replace('/', '')
                },
                body: data
            };
            logger.debug({
                message: 'Sending the following request to MSD',
                requestOptions,
                options,
                functionName: 'pushMSDData'
            });
            return rp(requestOptions);
        })
        .catch(function (error) {
            logger.error({
                requestError: error,
                message: 'Could not push the data to MSD',
                options,
                dataTable,
                functionName: 'pushMSDData'
            });
            return Promise.reject('Could not fetch the data from MSD');
        })
        .then(function (response) {
            logger.debug({
                message: 'Fetched data from MSD',
                response,
                functionName: 'pushMSDData',
                options
            });
            return Promise.resolve(response);
        });
};

module.exports = function (dependencies) {
    if (dependencies) {
        GlobalOrgModel = dependencies.GlobalOrgModel
    }
    return {
        refreshMSDToken: refreshMSDToken,
        fetchMSDData: fetchMSDData,
        pushMSDData: pushMSDData
    };
};
