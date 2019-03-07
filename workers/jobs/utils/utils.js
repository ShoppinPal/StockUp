var fileSystem = require('q-io/fs');
var fs = require('fs');
var Promise = require('bluebird');
var moment = require('moment');
var _ = require('underscore');
var vendSdk = require('vend-nodejs-sdk')({});
var requestPromise = require('request-promise');
var ObjectId = require('mongodb').ObjectID;
const path = require('path');
const commandName = path.basename(__filename, '.js'); // gives the filename without the .js extension
const logger = require('sp-json-logger')({fileName: 'workers:jobs:utils:' + commandName});

const Slack = require('slack-node');

var savePayloadConfigToFiles = function (payload) {
    logger.tag('inside savePayloadConfigToFiles()').debug({message: 'inside savePayloadConfigToFiles()'});

    var oauthFile = path.join(__dirname, '..', '..', 'config', 'oauth.json');
    //console.log('oauthFile: ' + oauthFile);
    logger.tag('OAuth File').debug({message: `oauthFile: ${oauthFile}`});
    return fileSystem.write(
        oauthFile,
        JSON.stringify({
            'access_token': payload.accessToken,
            'token_type': payload.tokenType,
            'refresh_token': payload.refreshToken,
            'domain_prefix': payload.domainPrefix
        }, null, 2))
        .then(function () {
                var clientFile = path.join(__dirname, '..', '..', 'config', 'client.json');
                //console.log('clientFile: ' + clientFile);
                logger.tag('Client File').debug({message: `clientFile: ${clientFile}`});
                return fileSystem.write(
                    clientFile,
                    JSON.stringify({
                        'token_service': payload.tokenService,
                        'client_id': payload.clientId,
                        'client_secret': payload.clientSecret
                    }, null, 2))
                    .then(function () {
                            // can't believe I need this code here, just to trap errors that won't float up the chain
                            return Promise.resolve();
                        },
                        function (err) { //TODO: why don't the errors caught by this block, travel up the chain when its absent?
                            //console.error(err);
                            logger.error({err: err});
                            return Promise.reject(err);
                        });
            },
            function (err) { //TODO: why don't the errors caught by this block, travel up the chain when its absent?
                //console.error(err);
                logger.error({err: err});
                return Promise.reject(err);
            });
};

var updateOauthTokens = function (connectionInfo) {
    //console.log('updating oauth.json ... in case there might have been token changes');
    logger.debug({message: 'updating oauth.json ... in case there might have been token changes'});
    //console.log('connectionInfo: ' + JSON.stringify(connectionInfo,null,2));
    var oauthFile = path.join(__dirname, '..', '..', 'config', 'oauth.json');
    // console.log('oauthFile: ' + oauthFile);
    logger.tag('OAuth File').debug({message: `oauthFile: ${oauthFile}`});
    return fileSystem.write(
        oauthFile,
        JSON.stringify({
            'access_token': connectionInfo.accessToken,
            'token_type': 'Bearer',
            'refresh_token': connectionInfo.refreshToken,
            'domain_prefix': connectionInfo.domainPrefix
        }, null, 2));
};

var loadOauthTokens = function (token, domain) {
    // (1) Check for oauth.json and client.json via nconf
    var nconf = require('nconf');
    logger.debug({message: 'nconf.get()', nconf: nconf.get()})

    // (2) try to load client_id and client_secret and whatever else
    var connectionInfo = {
        domainPrefix: nconf.get('domain_prefix') || domain,
        accessToken: nconf.get('access_token') || token,
        // if you want auto-reties on 401, additional data is required:
        refreshToken: nconf.get('refresh_token'),
        vendTokenService: nconf.get('token_service'),
        vendClientId: nconf.get('client_id'),
        vendClientSecret: nconf.get('client_secret')
    };
    //console.log('connectionInfo: ', connectionInfo);

    // (3) if not successful then ask for it as CLI arguments
    if (!connectionInfo.accessToken) {
        throw new Error('--token should be set');
    }
    if (!connectionInfo.domainPrefix) {
        throw new Error('--domain should be set');
    }

    return connectionInfo;
};

var getAbsoluteFilename = function (commandName, extension) {
    var nconf = require('nconf');

    var defaultOutputDirectory = nconf.get('defaultOutputDirectory');
    var timestampFiles = nconf.get('timestampFiles');

    var filename = setFilename(commandName, timestampFiles, extension);

    if (defaultOutputDirectory && defaultOutputDirectory.trim().length>0) {
        if (!fs.existsSync(defaultOutputDirectory)) {
            fs.mkdirSync(defaultOutputDirectory);
        }
        var stats = fs.statSync(defaultOutputDirectory);
        if (stats.isDirectory()) {
            filename = path.join(defaultOutputDirectory, setFilename(commandName, timestampFiles, extension));
        }
    }

    return filename;
};

var setFilename = function (commandName, timestampFiles, extension) {
    var extension = extension || '.json';
    if (timestampFiles) {
        return commandName + '-' + moment.utc().format('YYYY-MMM-DD_HH-mm-ss') + extension;
    }
    else {
        return commandName + extension;
    }
};

var exportToJsonFileFormat = function (commandName, data) {
    if (data !== undefined && data !== null) {
        var filename = getAbsoluteFilename(commandName);
        //console.log('saving to ' + filename);
        logger.debug({message: `saving to ${filename}`});
        return fileSystem.write(filename, // save to current working directory
            JSON.stringify(data, vendSdk.replacer, 2));
    }
    else {
        return Promise.reject('no data provided for exportToJsonFileFormat()');
    }
};

var notifyClient = function (taskPayload, taskConfig, notificationPayload) {
    var notificationUrl = taskPayload.notificationUrl || taskConfig.notificationUrl;
    if (notificationUrl && taskPayload.notificationId) {
        notificationPayload.notificationId = taskPayload.notificationId;
        var options = {
            method: 'POST'
            , uri: notificationUrl
            , form: notificationPayload // Will be urlencoded
        };
        return requestPromise(options)
            .catch(function (err) {
                //console.error('Client notification failed.', err);
                logger.error({err: err, message: 'Client notification failed.'});
                return Promise.resolve(); // the job should still be consider successful
            });
    }
    else {
        logger.debug({message: 'Client was not notified. Please configure notificationUrl and notificationId.'});
        return Promise.resolve(); // the job should still be consider successful
    }
};

var fetchVendToken = function (db, orgModelId, messageId) {
    logger.debug({
        message: 'Will refresh Vend token',
        functionName: 'fetchVendToken',
        messageId
    });
    var integrationModelInstance = null, token = null;
    return db.collection('IntegrationModel').findOne({
        orgModelId: ObjectId(orgModelId)
    })
        .catch(function (error) {
            logger.error({
                message: 'Could not find integrationModel for org',
                error,
                messageId,
                orgModelId,
                functionName: 'fetchVendToken'
            });
            return Promise.reject('Could not find integrationModel for org');
        })
        .then(function (response) {
            integrationModelInstance = response;
            logger.debug({
                message: 'Found this integrationModel',
                integrationModelInstance,
                functionName: 'fetchVendToken'
            });
            if (integrationModelInstance) {
                if (integrationModelInstance.expires<(Date.now() / 1000)) {
                    logger.debug({
                        message: 'Token expired, will refresh',
                        tokenExpiredOn: integrationModelInstance.expires,
                        functionName: 'fetchVendToken',
                        messageId
                    });
                    let vendConfig = {
                        token_service: process.env.VEND_TOKEN_SERVICE,
                        client_id: process.env.VEND_CLIENT_ID,
                        client_secret: process.env.VEND_CLIENT_SECRET
                    };
                    let tokenService = 'https://' + integrationModelInstance.domain_prefix + vendConfig.token_service;
                    console.log('here', tokenService, vendConfig.client_id, vendConfig.client_secret, integrationModelInstance.refresh_token, integrationModelInstance.domain_prefix);
                    return vendSdk.refreshAccessToken(tokenService, vendConfig.client_id, vendConfig.client_secret, integrationModelInstance.refresh_token, integrationModelInstance.domain_prefix);
                }
                else {
                    logger.debug({
                        message: 'Token not expired, will return the existing token',
                        functionName: 'fetchVendToken',
                        messageId
                    });
                    return Promise.resolve('tokenNotExpired');
                }
            }
            else {
                logger.error({
                    message: 'Could not find any integrations for org',
                    messageId,
                    functionName: 'fetchVendToken'
                });
                return Promise.reject('Could not find any integrations for org');
            }
        })
        .catch(function (error) {
            logger.error({
                errs: error,
                message: 'Access token could not be refreshed',
                functionName: 'fetchVendToken',
                messageId
            });
            return Promise.reject('Access token could not be refreshed');
        })
        .then(function (res) {
            if (res !== 'tokenNotExpired') {
                token = res.access_token;
                logger.debug({
                    message: 'Will save the new access token to db',
                    functionName: 'fetchVendToken',
                    messageId
                });
                return db.collection('IntegrationModel').updateOne({
                    orgModelId: ObjectId(orgModelId)
                }, {
                    $set: {
                        access_token: res.access_token,
                        refresh_token: res.refresh_token,
                        expires: res.expires,
                        expires_in: res.expires_in
                    }
                });
            }
            else {
                return Promise.resolve('tokenNotExpired');
            }
        })
        .catch(function (error) {
            logger.error({
                message: 'Could not update new access token to the db',
                error,
                functionName: 'fetchVendToken',
                messageId
            });
            return Promise.reject('Could not update new access token to the db');
        })
        .then(function (response) {
            if (response !== 'tokenNotExpired') {
                logger.debug({
                    message: 'Updated new token to db',
                    response,
                    functionName: 'fetchVendToken',
                    messageId
                });
                return Promise.resolve(token);
            }
            else {
                return integrationModelInstance.access_token;
            }
        });
};


function sendSlackMessage(title, message, success) {
    var color = 'good';
    var webhookUri = process.env.SLACK_NOTIFICATION_URL;
    var slack = new Slack();
    slack.setWebhook(webhookUri);
    if (!success) {
        emoji = ':skull:';
        color = 'danger';
    }
    slack.webhook({
        username: 'workersV2',
        icon_emoji: emoji,
        attachments: [
            {
                color: color,
                fields: [
                    {
                        title: title,
                        value: message
                    }
                ]
            }
        ],
    }, function (err, response) {
        if (err) {
            logger.error({
                err: err,
                message: 'Error in SlackMessaging',
                functionName: 'sendSlackMessage'
            });
        }else {
            logger.debug({
                response,
                message: 'SlackMessaging',
                functionName: 'sendSlackMessage'
            });
        }
    });
}

exports.savePayloadConfigToFiles = savePayloadConfigToFiles;
exports.getAbsoluteFilename = getAbsoluteFilename;
exports.loadOauthTokens = loadOauthTokens;
exports.updateOauthTokens = updateOauthTokens;
exports.fetchVendToken = fetchVendToken;
exports.exportToJsonFileFormat = exportToJsonFileFormat;
exports.notifyClient = notifyClient;
exports.sendSlackMessage = sendSlackMessage;

var port = process.env.APP_PORT_NUMBER ? ':' + process.env.APP_PORT_NUMBER : '';
exports.API_URL = process.env.APP_PROTOCOL + '://' + process.env.APP_HOST_NAME + port;

exports.REPORT_STATES = {
    EXECUTING: 'Executing...',
    GENERATED: 'Generated',
    ERROR: 'Error',
    PUSHING_TO_MSD: 'Pushing to MSD',
    PUSHED_TO_MSD: 'Pushed to MSD'
};
