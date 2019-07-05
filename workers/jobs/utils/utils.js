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
                        expires: res.expires,
                        expires_in: res.expires_in,
                        updatedAt: new Date()
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

function getVendConnectionInfo(db, orgModelId) {
    return db.collection('IntegrationModel').findOne({
        orgModelId: ObjectId(orgModelId)
    })
        .catch(function (error) {
            logger.error({
                message: 'Could not find integrations for this org',
                orgModelId,
                error,
                functionName: 'getVendConnectionInfo'
            });
            return Promise.reject('Could not find integration for this org');
        })
        .then(function (integrationModelInstance) {
            logger.debug({
                message: 'Found integration details, will fetch vend outlets',
                functionName: 'getVendConnectionInfo',
                orgModelId
            });
            var connectionInfo = {
                domainPrefix: integrationModelInstance.domain_prefix,
                client_id: integrationModelInstance.client_id,
                client_secret: integrationModelInstance.client_secret,
                accessToken: integrationModelInstance.access_token
            };
            return Promise.resolve(connectionInfo);
        });
}

function createStockOrderForVend(db, storeModelInstance, reportModelInstance, supplierModelInstance, messageId) {
    var orgModelId = storeModelInstance.orgModelId;
    var reportName = reportModelInstance.name;
    var outletId = storeModelInstance.storeNumber;
    logger.debug({
        message: 'Will create stock order in vend',
        reportModelInstance,
        messageId,
        functionName: 'createStockOrderForVend'
    });
    return fetchVendToken(db, orgModelId, messageId)
        .then(function (token) {
            logger.debug({
                message: 'Fetched vend token, will fetch connection info',
                messageId,
                functionName: 'createStockOrderForVend'
            });
            return getVendConnectionInfo(db, orgModelId, messageId);
        })
        .then(function (connectionInfo) {
            var argsForStockOrder = vendSdk.args.consignments.stockOrders.create();
            argsForStockOrder.name.value = reportName;
            argsForStockOrder.outletId.value = outletId;
            argsForStockOrder.supplierId.value = supplierModelInstance ? supplierModelInstance.api_id : null;
            logger.debug({
                message: 'Fetched connection info for vend, will create order in vend',
                messageId,
                argsForStockOrder,
                connectionInfo,
                functionName: 'createStockOrderForVend'
            });
            return vendSdk.consignments.stockOrders.create(argsForStockOrder, connectionInfo);
        })
        .catch(function (error) {
            logger.error({
                reason: error,
                error,
                message: 'Error creating stock order in Vend',
                messageId,
                functionName: 'createStockOrderForVend'
            });
            return Promise.reject('An error occurred while creating a stock order in Vend.\n' + JSON.stringify(error));
        })
        .then(function (newStockOrder) {
            logger.debug({
                message: 'Created stock order in vend',
                newStockOrder: newStockOrder,
                messageId,
                functionName: 'createStockOrderForVend'
            });
            return Promise.resolve(newStockOrder);
        });
}

function markStockOrderAsSent(db, reportModelInstance, messageId) {
    return fetchVendToken(db, reportModelInstance.orgModelId, messageId)
        .then(function (token) {
            logger.debug({
                message: 'Fetched vend token, will fetch connection info',
                messageId,
                functionName: 'markStockOrderAsSent'
            });
            return getVendConnectionInfo(db, reportModelInstance.orgModelId, messageId);
        })
        .then(function (connectionInfo) {
            var argsForStockOrder = vendSdk.args.consignments.stockOrders.markAsSent();
            argsForStockOrder.apiId.value = reportModelInstance.vendConsignmentId;
            argsForStockOrder.body.value = _.omit(reportModelInstance.vendConsignment, 'id');
            return vendSdk.consignments.stockOrders.markAsSent(argsForStockOrder, connectionInfo);
        })
        .catch(function (error) {
            logger.error({
                message: 'Error marking order as sent in vend',
                error,
                reason: error,
                messageId,
                functionName: 'markStockOrderAsSent'
            });
            return Promise.reject('Error marking order as sent in vend');
        });
}

function createStockOrderLineitemForVend(db, storeModelInstance, reportModelInstance, stockOrderLineitemModelInstance, messageId) {
    return fetchVendToken(db, storeModelInstance.orgModelId, messageId)
        .then(function (token) {
            logger.debug({
                message: 'Fetched vend token, will fetch connection info',
                messageId,
                functionName: 'createStockOrderLineitemForVend'
            });
            return getVendConnectionInfo(db, storeModelInstance.orgModelId, messageId);
        })
        .then(function (connectionInfo) {
            var consignmentProduct = {
                'consignment_id': reportModelInstance.vendConsignmentId,
                'product_id': stockOrderLineitemModelInstance.product_id,
                'count': stockOrderLineitemModelInstance.count,
                'cost': stockOrderLineitemModelInstance.supplyPrice
            };
            return vendSdk.consignments.products.create({body: consignmentProduct}, connectionInfo);
        })
        .catch(function (error) {
            logger.error({
                message: 'Error creating consignment product in vend',
                error,
                reason: error,
                messageId,
                functionName: 'createStockOrderLineitemForVend'
            });
            return Promise.reject('Error creating consignment product in vend');
        });
}

function updateStockOrderLineitemForVend(db, reportModelInstance, stockOrderLineitemModelInstance, messageId) {
    return fetchVendToken(db, reportModelInstance.orgModelId, messageId)
        .then(function (token) {
            logger.debug({
                message: 'Fetched vend token, will fetch connection info',
                messageId,
                functionName: 'updateStockOrderLineitemForVend'
            });
            return getVendConnectionInfo(db, reportModelInstance.orgModelId, messageId);
        })
        .then(function (connectionInfo) {
            var args = vendSdk.args.consignments.products.update();
            args.apiId.value = stockOrderLineitemModelInstance.vendConsignmentProductId;
            // args.body.value = _.omit(stockOrderLineitemModelInstance.vendConsignmentProduct, 'id'); // omitting id is BAD in this case
            args.body.value = stockOrderLineitemModelInstance.vendConsignmentProduct;
            args.body.value.count = stockOrderLineitemModelInstance.orderQuantity;
            args.body.value.cost = stockOrderLineitemModelInstance.supplyPrice;
            args.body.value.received = stockOrderLineitemModelInstance.receivedQuantity;
            //log.debug('updateStockOrderLineitemForVend()', 'consignmentProduct: ', args.body.value);
            logger.tag('updateStockOrderLineitemForVend()').debug({
                log: {
                    message: 'updateStockOrderLineitemForVend()',
                    consignmentProduct: args.body.value
                }
            });
            return vendSdk.consignments.products.update(args, connectionInfo)
                .then(function (updatedLineitem) {
                    //log.debug('updatedLineitem', updatedLineitem);
                    logger.debug({log: {updatedLineitem: updatedLineitem}});
                    return Promise.resolve(updatedLineitem);
                });
        })
        .catch(function (error) {
            if (error instanceof Error) {
                // log.error('updateStockOrderLineitemForVend()',
                //   'Error updating a stock order lineitem in Vend:',
                //   '\n', error.name + ':', error.message,
                //   '\n', error.stack);
                logger.error({err: error, message: 'Error updating a stock order lineitem in Vend'});
            }
            else {
                //log.error('updateStockOrderLineitemForVend()', 'Error updating a stock order lineitem in Vend:\n' + JSON.stringify(error));
                logger.error({err: error, message: 'Error updating a stock order lineitem in Vend'});
            }
            return Promise.reject('An error occurred while updating a stock order lineitem in Vend.\n' + JSON.stringify(error));
        });
};

function markStockOrderAsReceived(db, reportModelInstance, messageId) {
    return fetchVendToken(db, reportModelInstance.orgModelId, messageId)
        .then(function (token) {
            logger.debug({
                message: 'Fetched vend token, will fetch connection info',
                messageId,
                functionName: 'updateStockOrderLineitemForVend'
            });
            return getVendConnectionInfo(db, reportModelInstance.orgModelId, messageId);
        })
        .then(function (connectionInfo) {
            var argsForStockOrder = vendSdk.args.consignments.stockOrders.markAsSent();
            argsForStockOrder.apiId.value = reportModelInstance.vendConsignmentId;
            argsForStockOrder.body.value = _.omit(reportModelInstance.vendConsignment, 'id');
            return vendSdk.consignments.stockOrders.markAsReceived(argsForStockOrder, connectionInfo);
        })
        .catch(function (error) {
            if (error instanceof Error) {
                // log.error('markStockOrderAsReceived()',
                //   'Error updating the stock order in Vend:',
                //   '\n', error.name + ':', error.message,
                //   '\n', error.stack);
                logger.error({err: error, message: 'Error updating the stock order in Vend'});
            }
            else {
                //log.error('markStockOrderAsReceived()', 'Error updating the stock order in Vend:\n' + JSON.stringify(error));
                logger.error({err: error, message: 'Error updating the stock order in Vend'});
            }
            return Promise.reject('An error occurred while updating the stock order in Vend.\n' + JSON.stringify(error));
        });
}

function deleteStockOrderLineitemForVend(db, stockOrderLineitemModelInstance, messageId) {
    return fetchVendToken(db, stockOrderLineitemModelInstance.orgModelId, messageId)
        .then(function (token) {
            logger.debug({
                message: 'Fetched vend token, will fetch connection info',
                messageId,
                functionName: 'updateStockOrderLineitemForVend'
            });
            return getVendConnectionInfo(db, stockOrderLineitemModelInstance.orgModelId, messageId);
        })
        .then(function (connectionInfo) {
                var args = vendSdk.args.consignments.products.remove();
                args.apiId.value = stockOrderLineitemModelInstance.vendConsignmentProductId;
                return vendSdk.consignments.products.remove(args, connectionInfo);
            },
            function (error) {
                //log.error('deleteStockOrderLineitemForVend()', 'Error deleting a stock order lineitem in Vend:\n' + JSON.stringify(error));
                logger.tag('deleteStockOrderLineitemForVend()').error({
                    err: error,
                    message: 'Error deleting a stock order lineitem in Vend'
                });
                return Promise.reject('An error occurred while deleting a stock order lineitem in Vend.\n' + JSON.stringify(error));
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
exports.getVendConnectionInfo = getVendConnectionInfo;
exports.markStockOrderAsSent = markStockOrderAsSent;
exports.markStockOrderAsReceived = markStockOrderAsReceived;
exports.createStockOrderForVend = createStockOrderForVend;
exports.createStockOrderLineitemForVend = createStockOrderLineitemForVend;
exports.updateStockOrderLineitemForVend = updateStockOrderLineitemForVend;
exports.deleteStockOrderLineitemForVend = deleteStockOrderLineitemForVend;
exports.REPORT_STATES = {
    "PROCESSING": "Processing",
    "PROCESSING_FAILURE": "Processing failure",
    "GENERATED": "Generated",
    "APPROVAL_IN_PROCESS": "Approval in Process",
    "SENDING_TO_SUPPLIER": "Sending to Supplier",
    "ERROR_SENDING_TO_SUPPLIER": "Error sending to Supplier",
    "FULFILMENT_PENDING": "Fulfilment pending",
    "FULFILMENT_IN_PROCESS": "Fulfilment in Process",
    "FULFILMENT_FAILURE": "Fulfilment failure",
    "RECEIVING_PENDING": "Receiving pending",
    "RECEIVING_IN_PROCESS": "Receiving in process",
    "RECEIVING_FAILURE": "Receiving failure",
    "COMPLETE": "Complete"
};


var port = process.env.APP_PORT_NUMBER ? ':' + process.env.APP_PORT_NUMBER : '';
exports.API_URL = process.env.APP_PROTOCOL + '://' + process.env.APP_HOST_NAME + port;
const notificationPort = process.env.NOTIFICATION_PORT ? ':' + process.env.NOTIFICATION_PORT : '';
exports.PUBLISH_URL = process.env.NOTIFICATION_PROTOCOL + '://' + process.env.NOTIFICATION_HOST + notificationPort
    + '/'+ process.env.NOTIFICATION_PATH;

exports.messageFor = {
    MESSAGE_FOR_CLIENT: 'MESSAGE_FOR_CLIENT',
    MESSAGE_FOR_API: 'MESSAGE_FOR_API'
};

exports.workerType = {
    GENERATE_STOCK_ORDER: 'GENERATE_STOCK_ORDER',
    RECEIVE_CONSIGNMENT: 'RECEIVE_CONSIGNMENT',
    CREATE_PURCHASE_ORDER_VEND: 'CREATE_PURCHASE_ORDER_VEND',
    SYNC_WORKER: 'SYNC_WORKER',
};

exports.workerStatus = {
    STARTED: 'STARTED',
    PROCESSING: 'PROCESSING',
    SUCCESS: 'SUCCESS',
    FAILED: 'FAILED',
};

exports.Notification = function (eventType, messageFor, status, data, callId) {
    this.eventType= eventType;
    this.messageFor = messageFor;
    this.status = status;
    this.data = data;
    this.callId = callId;
};
