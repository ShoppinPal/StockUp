'use strict';

var Promise = require('bluebird');
const path = require('path');
const fileName = path.basename(__filename, '.js'); // gives the filename without the .js extension
const logger = require('sp-json-logger')({fileName: 'common:models:' + fileName});
const rp = require('request-promise');
const dbUrl = process.env.DB_URL;
const MongoClient = require('mongodb').MongoClient;
const ObjectId = require('mongodb').ObjectID;
const _ = require('underscore');
var http = require("https");

var refreshMSDToken = function (db, orgModelId) {
    logger.debug({
        message: 'Will refresh MSD token',
        orgModelId: orgModelId,
        functionName: 'refreshMSDToken'
    });
    var newAccessToken = null;
    return db.collection('IntegrationModel').findOne({
        orgModelId: ObjectId(orgModelId)
    })
        .catch(function (error) {
            logger.error({
                message: 'Could not find integrations for this org',
                orgModelId,
                error,
                functionName: 'refreshMSDToken'
            });
            return Promise.reject('Could not find integration for this org');
        })
        .then(function (integrationModelInstance) {
            logger.debug({
                message: 'Found this integration model',
                integrationModelInstance,
                functionName: 'refreshMSDToken'
            });
            try {
                //remove trailing '/' in resource
                var resource = integrationModelInstance.resource;
                resource = resource.endsWith('/') ? resource.substr(0, resource.length - 1) : resource;
                var options = {
                    method: 'POST',
                    uri: process.env.MSDYNAMICS_TOKEN_URL,
                    form: {
                        client_id: process.env.MSDYNAMICS_CLIENT_ID,
                        client_secret: process.env.MSDYNAMICS_CLIENT_SECRET,
                        grant_type: 'refresh_token',
                        refresh_token: integrationModelInstance.refresh_token,
                        resource: resource
                    },
                    json: true
                };
            }
            catch (e) {
                console.error(e);
            }
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
            return db.collection('IntegrationModel').updateOne({
                orgModelId: orgModelId
            }, {
                $set: {
                    access_token: token.access_token,
                    refresh_token: token.refresh_token,
                    expires_on: token.expires_on,
                    not_before: token.not_before,
                    updatedAt: new Date()
                }
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

var pushMSDData = function (db, orgModelId, dataTable, data, options) {
    logger.debug({
        message: 'Will push the following data to msd',
        options,
        dataTable,
        data,
        functionName: 'pushMSDData'
    });
    var orgModelInstance, integrationModel;

    return db.collection('IntegrationModel').findOne({
        orgModelId: ObjectId(orgModelId)
    })
        .catch(function (error) {
            logger.error({
                message: 'Could not find integration model for org',
                options,
                error,
                functionName: 'pushMSDData'
            });
            return Promise.reject('Could not find integration model for org');
        })
        .then(function (integrationModelInstance) {
            integrationModel = integrationModelInstance;
            logger.debug({
                message: 'Found this integration model instance',
                integrationModelInstance,
                functionName: 'pushMSDData',
                options
            });
            if (integrationModelInstance.expires_on<(Date.now() / 1000)) {
                logger.debug({
                    message: 'Will refresh token first',
                    tokenExpiredOn: integrationModelInstance.expires_on,
                    functionName: 'pushMSDData',
                    options
                });
                return refreshMSDToken(db, orgModelId);
            }
            else {
                return Promise.resolve('tokenNotExpired');
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
                token = integrationModel.access_token;
            }
            var requestOptions = {
                method: 'POST',
                uri: integrationModel.resource + 'data/' + dataTable,
                json: true,
                headers: {
                    'OData-MaxVersion': '4.0',
                    'OData-Version': '4.0',
                    'Content-Type': 'application/json;odata.metadata=minimal',
                    'Accept': 'application/json;odata.metadata=minimal',
                    'Accept-Charset': 'UTF-8',
                    'Authorization': integrationModel.token_type + ' ' + token,
                    'Host': integrationModel.resource.replace('https://', '').replace('http://', '').replace('/', '')
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

var pushMSDDataInBatches = function (db, orgModelId, dataTable, data, options) {
    logger.debug({
        message: 'Will push the following data to msd',
        options,
        dataTable,
        data,
        functionName: 'pushMSDDataInBatches'
    });
    var integrationModel;

    return db.collection('IntegrationModel').findOne({
        orgModelId: ObjectId(orgModelId)
    })
        .catch(function (error) {
            logger.error({
                message: 'Could not find integrations for this org',
                orgModelId,
                error,
                functionName: 'refreshMSDToken'
            });
            return Promise.reject('Could not find integration for this org');
        })
        .then(function (integrationModelInstance) {
            logger.debug({
                message: 'Found this integration model',
                integrationModelInstance,
                functionName: 'refreshMSDToken'
            });
            integrationModel = integrationModelInstance;
            if (integrationModelInstance.expires_on<(Date.now() / 1000)) {
                logger.debug({
                    message: 'Will refresh token first',
                    tokenExpiredOn: integrationModelInstance.expires_on,
                    functionName: 'fetchMSDData',
                    options
                });
                return refreshMSDToken(db, orgModelId);
            }
            else {
                return Promise.resolve('tokenNotExpired');
            }
        })
        .catch(function (error) {
            logger.error({
                error,
                message: 'Access token could not be refreshed',
                functionName: 'pushMSDDataInBatches',
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
                    functionName: 'pushMSDDataInBatches'
                });
            }
            else {
                token = integrationModel.access_token;
            }

            if (!(data instanceof Array) || data.length === 0) {
                logger.error({
                    message: 'Data should be a valid array',
                    data,
                    options,
                    functionName: 'pushMSDDataInBatches'
                });
                return Promise.reject('Data should be a valid array');
            }

            var postBody = '', contentIDCounter = 0;

            postBody += '--batch_1\n' +
                'Content-Type: multipart/mixed; boundary=changeset_1\n' +
                'Content-Length: ###\n\n';

            for (var i = 0; i<data.length; i++) {
                if (contentIDCounter === 10) {
                    contentIDCounter = 0;
                    postBody += '--batch_1\n' +
                        'Content-Type: multipart/mixed; boundary=changeset_1\n' +
                        'Content-Length: ###\n\n';
                }

                postBody += '--changeset_1\n' +
                    'Content-Type: application/http\n' +
                    'Content-Transfer-Encoding:binary\n' +
                    'Content-ID: ' + (contentIDCounter + 1) + '\n\n';

                postBody += 'POST ' + integrationModel.resource + 'data/' + dataTable + ' HTTP/1.1\n' +
                    'Host: ' + integrationModel.resource.replace('https://', '').replace('http://', '').replace('/', '') + '\n' +
                    'Content-Type: application/json\n' +
                    'Accept-Charset: UTF-8\n\n';
                postBody += JSON.stringify(data[i]) + '\n\n';
                contentIDCounter++;
            }

            var requestOptions = {
                method: 'POST',
                hostname: integrationModel.resource.replace('https://', '').replace('http://', '').replace('/', ''),
                path: '/data/$batch',
                headers: {
                    'OData-MaxVersion': '4.0',
                    'OData-Version': '4.0',
                    'Content-Type': 'multipart/mixed; boundary=batch_1',
                    'Accept': 'application/json;odata.metadata=minimal',
                    'Accept-Charset': 'UTF-8',
                    'Authorization': integrationModel.token_type + ' ' + token,
                    'Host': integrationModel.resource.replace('https://', '').replace('http://', '').replace('/', '')
                }
            };

            logger.debug({
                message: 'Sending the following request to MSD',
                requestOptions,
                options,
                functionName: 'pushMSDDataInBatches'
            });
            return httpRequest(requestOptions, postBody);
        })
        .catch(function (error) {
            logger.error({
                requestError: error,
                message: 'Could not push the data to MSD',
                options,
                dataTable,
                functionName: 'pushMSDDataInBatches'
            });
            return Promise.reject('Could not fetch the data from MSD');
        })
        .then(function (response) {
            var count = (response.match(/Created/g) || []).length;
            logger.debug({
                message: 'Pushed data to MSD in batches successfully',
                count: count,
                functionName: 'pushMSDDataInBatches',
                options
            });
            return Promise.resolve();
        });
};

function httpRequest(params, postData) {
    return new Promise(function (resolve, reject) {
        var req = http.request(params, function (res) {
            // reject on bad status
            if (res.statusCode<200 || res.statusCode>=300) {
                console.log('error3', res);
                return reject(new Error('statusCode=' + res.statusCode));
            }
            // cumulate data
            var chunks = [];
            res.on('data', function (chunk) {
                chunks.push(chunk);
            });
            // resolve on end
            res.on('end', function () {
                try {
                    var body = Buffer.concat(chunks);
                }catch (e) {
                    console.log('error1', e);
                    reject(e);
                }
                resolve(body.toString());
            });
        });
        // reject on request error
        req.on('error', function (err) {
            // This is not a "Second reject", just a different sort of failure
            console.log('error2', err);
            reject(err);
        });
        if (postData) {
            req.write(postData);
        }
        // IMPORTANT
        req.end();
    });
}

module.exports = {
    refreshMSDToken: refreshMSDToken,
    pushMSDData: pushMSDData,
    pushMSDDataInBatches: pushMSDDataInBatches
}
