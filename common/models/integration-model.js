'use strict';

const path = require('path');
const fileName = path.basename(__filename, '.js'); // gives the filename without the .js extension
const logger = require('sp-json-logger')({fileName: 'common:models:' + fileName});

module.exports = function (IntegrationModel) {

    // wrap the whole model in Promise
    // but we need to avoid 'validate' method
    IntegrationModel = Promise.promisifyAll(
        IntegrationModel,
        {
            filter: function (name, func, target) {
                return !( name == 'validate');
            }
        }
    );

    IntegrationModel.fetchAuthorizationUrl = function (integrationType, options) {
        logger.debug({
            message: 'Fetching auth url for integration type',
            integrationType,
            functionName: 'fetchAuthorizationUrl'
        });
        var authUrl = '';
        try {
            if (integrationType === 'vend') {
                authUrl += IntegrationModel.app.get('integrations').vend.auth_endpoint;
                authUrl += '?client_id=' + IntegrationModel.app.get('integrations').vend.client_id;
                authUrl += '&redirect_uri=' + IntegrationModel.app.get('site').baseUrl + '/api/OrgModels/handleVendToken';
            }
            else if (integrationType === 'msdynamics') {
                authUrl += IntegrationModel.app.get('integrations').msDynamics.auth_endpoint;
                authUrl += '?client_id=' + IntegrationModel.app.get('integrations').msDynamics.client_id;
                authUrl += '&redirect_uri=' + IntegrationModel.app.get('site').baseUrl + '/api/OrgModels/handleMSDToken';
                authUrl += '&resource='+IntegrationModel.app.get('integrations').msDynamics.resource_url; //TODO: bring this from orgModel
            }
            else {
                return Promise.reject('Integration type is not supported');
            }
            authUrl += '&response_type=code';
            authUrl += '&state=' + options.accessToken.id;
        }
        catch (err) {
            logger.error({
                err,
                message: 'One or more integration env variables are not properly configured',
                functionName: 'fetchAuthorizationUrl'
            });
            return Promise.reject('One or more integration env variables are not properly configured');
        }
        logger.debug({
            message: 'Fetched this authUrl for user',
            authUrl,
            functionName: 'fetchAuthorizationUrl'
        });
        return Promise.resolve(authUrl);
    };

};
