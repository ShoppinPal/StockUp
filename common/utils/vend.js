'use strict';
var OrgModel = null;
const path = require('path');
const fileName = path.basename(__filename, '.js'); // gives the filename without the .js extension
var _ = require('underscore')
    , q = require('q')
    , Promise = require('bluebird')// TODO: stick to one promise library: Q or bluebird
    , vendSdk = require('vend-nodejs-sdk')({});

const logger = require('sp-json-logger')({fileName: 'common:utils:' + fileName});

var fetchVendToken = function (orgModelId, options) {
    logger.debug({
        message: 'Will refresh Vend token',
        options,
        functionName: 'fetchVendToken'
    });
    var orgModelInstance = null, token = null;
    return OrgModel.findById(orgModelId, {
        include: 'integrationModels'
    })
        .catch(function (error) {
            logger.error({
                message: 'Could not find orgModel',
                options,
                error,
                functionName: 'fetchVendToken'
            });
            return Promise.reject('Could not find orgModel');
        })
        .then(function (response) {
            orgModelInstance = response;
            logger.debug({
                message: 'Found this orgModel',
                orgModelInstance,
                options,
                functionName: 'fetchVendToken'
            });
            if (orgModelInstance.integrationModels().length) {
                if (orgModelInstance.integrationModels()[0].expires<(Date.now() / 1000)) {
                    logger.debug({
                        message: 'Token expired, will refresh',
                        tokenExpiredOn: orgModelInstance.integrationModels()[0].expires,
                        functionName: 'fetchVendToken',
                        options
                    });
                    let vendConfig = OrgModel.app.get('integrations').vend;
                    let tokenService = 'https://' + orgModelInstance.integrationModels()[0].domain_prefix + vendConfig.token_service;
                    return vendSdk.refreshAccessToken(
                        tokenService,
                        vendConfig.client_id,
                        vendConfig.client_secret,
                        orgModelInstance.integrationModels()[0].refresh_token,
                        orgModelInstance.integrationModels()[0].domain_prefix
                    );
                }
                else {
                    logger.debug({
                        message: 'Token not expired, will return the existing token',
                        functionName: 'fetchVendToken',
                        options
                    });
                    return Promise.resolve('tokenNotExpired');
                }
            }
            else {
                logger.error({
                    message: 'Could not find any integrations for org',
                    options,
                    functionName: 'fetchVendToken'
                });
                return Promise.reject('Could not find any integrations for org');
            }
        })
        .catch(function (error) {
            logger.error({
                error,
                reason: error,
                message: 'Access token could not be refreshed',
                functionName: 'fetchVendToken',
                options
            });
            return Promise.reject('Access token could not be refreshed');
        })
        .then(function (res) {
            if (res !== 'tokenNotExpired') {
                logger.debug({
                    message: 'Will save the new access token to db',
                    res,
                    functionName: 'fetchVendToken',
                    options
                });
                return OrgModel.app.models.IntegrationModel.updateAll({
                    orgModelId: orgModelId
                }, {
                    access_token: res.access_token,
                    expires: res.expires,
                    expires_in: res.expires_in,
                    updatedAt: new Date()
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
                options
            });
            return Promise.reject('Could not update new access token to the db');
        })
        .then(function (response) {
            if (response !== 'tokenNotExpired') {
                logger.debug({
                    message: 'Updated new token to db',
                    response,
                    functionName: 'fetchVendToken',
                    options
                });
                return Promise.resolve(token);
            }
            else {
                return orgModelInstance.integrationModels()[0].access_token;
            }
        });
};


/**
 * TODO: deprecate and replace
 *
 * @param storeConfigId
 * @param accessToken
 * @returns {*} - a promise but no value
 */
var updateTokenDetails = function (storeConfigId, accessToken) {
    // NOTE: StoreConfigModel on the server side doesn't have ACL
    //       rules applied to it so its always in "master" mode
    return StoreConfigModel.updateAsync(
        {objectId: Number(storeConfigId)}, // where
        {vendAccessToken: accessToken}// data
    );
};

/**
 * Previous updateTokenDetails() method doesn't seem to work anymore
 * since the switch from memorydb to mongodb! Did it ever work?
 *
 * @param storeConfigId
 * @param accessToken
 */
var updateTokenDetailsAlt = function (storeConfigId, accessToken) {
    //log.debug('inside updateTokenDetailsAlt()');
    return StoreConfigModel.findOneAsync(
        {where: {objectId: storeConfigId}}
    )
        .then(function (storeConfig) {
            //log.debug('inside updateTokenDetailsAlt()', 'found storeConfig', storeConfig);
            return storeConfig.updateAttributeAsync('vendAccessToken', accessToken);
        })
        .catch(function (error) {
            if (error instanceof Error) {
                // log.error('updateTokenDetailsAlt()',
                //   '\n', error.name + ':', error.message,
                //   '\n', error.stack);
                logger.tag('updateTokenDetailsAlt()').error({err: error});
            }
            else {
                //log.error('updateTokenDetailsAlt()\n' + JSON.stringify(error));
                logger.error({err: error});
            }
            return Promise.reject('updateTokenDetailsAlt()\n' + JSON.stringify(error));
        });
};

// This backend is now responsible for saving a new instance of storeConfig for Vend POS.
var saveTokenDetails = function (accessToken, refreshToken, domainPrefix, sessionToken) {
    // TODO: if this is exposed via remote method then there is no need to validate token as ACLs would have done it
    //       the remote method we call on StoreConfigModel can discover the currentUser instance from sessionToken
    //       so that related models can have it as their $owner

    var storeConfigModel = Promise.promisifyAll(
        currentUser.storeConfigModels,
        {
            filter: function (name, func, target) {
                return !( name == 'validate');
            }
        }
    );

    return storeConfigModel.createAsync({
        // TODO: retailers in MP should not be able to fetch the oauth info,
        //       otherwise they can make calls and claim that it was ShoppinPal
        vendAccessToken: accessToken,
        vendRefreshToken: refreshToken,
        posUrl: 'https://' + domainPrefix + '.vendhq.com',
        posVendor: 'vend',
        productImportRules: {
            'op': 'AND',
            'rules': [
                {
                    'applyTo': 'inventory',
                    'condition': 'greaterThan',
                    'field': 'count',
                    'values': ['0']
                },
                {
                    'condition': 'doesNotExist',
                    'field': 'variant_parent_id'
                },
                {
                    'condition': 'doesNotContainSubString',
                    'field': 'image',
                    'skipIfFieldExists': 'variant_parent_id',
                    'values': [
                        'images/placeholder/product/no-image-white-original.png',
                        'images/placeholder/product/no-image-white-thumb.png',
                        'images/placeholder/uploading/uploading-white-original.gif',
                        'images/placeholder/uploading/uploading-white-thumb.gif'
                    ]
                }
            ]
        }
    })
        .then(function (storeConfig) {
            debug('created storeConfig w/ objectId: ' + storeConfig.objectId); // Do we need debug?
            logger.debug({log: {message: `created storeConfig w/ objectId: ${storeConfig.objectId}`}});
            return q(storeConfig);
        });
};

//TODO: accept currentUser as a method argument!
var token = function (code, domainPrefix, state, /*baseUrl,*/ restApiRoot, vendConfig) {
    /* jshint camelcase: false */
    var vendAccessToken = null;
    var vendRefreshToken = null;
    var vendDomainPrefix = null;

    // log.debug('inside token():' +
    //   '\n code: ' + code +
    //   '\n domainPrefix: ' + domainPrefix +
    //   '\n state ' + state + // user's authN session token
    //   //'\n baseUrl ' + baseUrl +
    //   '\n restApiRoot ' + restApiRoot +
    //   '\n vendConfig ' + vendConfig
    // );
    logger.debug({
        log: {
            message: `inside token()`,
            code: code,
            domainPrefix: domainPrefix,
            state: state,
            baseUrl: baseUrl,
            restApiRoot: restApiRoot,
            vendConfig: vendConfig
        }
    });
    var userSessionToken = state;

    // redirectUri is required again by Vend as a security check, not for actual use
    var redirectUri = process.env['site:baseUrl'] + restApiRoot + '/StoreConfigModels/token/vend';
    //log.debug('redirectUri: '+ redirectUri);
    logger.debug({log: {message: `redirectUri: ${redirectUri}`}});
    //log.debug('process.env: '+ JSON.stringify(process.env,null,2));
    //log.debug('process.env[\'site:baseUrl\']: '+ process.env['site:baseUrl']);

    return vendSdk.getInitialAccessToken(
        'https://' + domainPrefix + vendConfig.token_service,
        vendConfig.client_id,
        vendConfig.client_secret,
        redirectUri,
        code,
        domainPrefix,
        userSessionToken
    )
        .then(function (response) {
            //log.debug('Vend Token Details ' + JSON.stringify(response,null,2));
            logger.debug({log: {message: 'Vend token details', response: response}});
            vendAccessToken = response.access_token;
            vendRefreshToken = response.refresh_token;
            vendDomainPrefix = response.domain_prefix;
            return saveTokenDetails(vendAccessToken, vendRefreshToken, vendDomainPrefix, userSessionToken);
        })
        .then(function (storeConfigObject) {
                var redirectToThisUrl = process.env['site:baseUrl'] +
                    '/#/onboarding' +
                    '/' + storeConfigObject.objectId +
                    '/vend';
                //log.debug('redirecting to: ' + redirectToThisUrl);
                logger.debug({log: {message: `redirecting to: ${redirectToThisUrl}`}});
                return q(redirectToThisUrl);
            }
            , function (error) {
                //log.error('Error receiving token information: ', JSON.stringify(error));
                logger.error({err: error, message: 'Error receiving token information'});
                return q.reject('An error occurred while receiving token info.\n' + JSON.stringify(error));
            });
};

// TODO: don't use redis, just get this from loopback/vendsdk
var getAccessToken = function (storeConfigId) {
    /* jshint camelcase:false */

    var redisConfig = nconf.get('redis');
    var redisClient = redis.createClient(redisConfig);
    var StoreConfig = Parse.Object.extend('store_config');

    //accept an identifier to lookup the refresh token and access token
    // log.debug('getAccessToken():' +
    //     '\n\tstoreConfigId: ' + storeConfigId
    // );
    logger.debug({log: {message: 'getAccessToken()', storeConfigId: storeConfigId}});

    var accessTokenKey = 'vend_access_token:' + storeConfigId;
    var refreshTokenKey = 'vend_refresh_token:' + storeConfigId;

    return redisClient.connect()
        .then(function () {
            if (storeConfigId) {
                // log.debug('getAccessToken():' +
                //   '\n\tUsing passed in storeConfigId');
                logger.debug({log: {message: `getAccessToken() Using passed in storeConfigId`}});
                return q(storeConfigId);
            }

            return q.reject('No storeConfigId was passed in.'); //TODO: move it to the very beginning of this method
        })
        .then(function (storeConfigId) {
                //log.debug('Store config id from promise is: ' + storeConfigId);
                logger.debug({log: {message: `Store config id from promise is: ${storeConfigId}`}});
                accessTokenKey = 'vend_access_token:' + storeConfigId;
                refreshTokenKey = 'vend_refresh_token:' + storeConfigId;

                return redisClient.get(accessTokenKey)
                    .then(function (value) {
                            if (value) {
                                // log.debug('Access token obtained from redis:' +
                                //   '\n\tkey: ' + accessTokenKey +
                                //   '\n\tvalue: ' + value);
                                logger.debug({
                                    log: {
                                        message: 'Access token obtained from redis',
                                        key: accessTokenKey,
                                        value: value
                                    }
                                });
                                redisClient.disconnect();
                                return q(value);
                            }
                            else {
                                //log.debug('Access token not found in redis.');
                                logger.debug({log: {message: 'Access token not found in redis.'}});
                                return redisClient.get(refreshTokenKey)
                                    .then(function (value) {
                                        StoreConfigModel.findOneAsync(
                                            {filter: {where: {id: value}}}
                                        )
                                            .then(function (storeConfigObject) {
                                                var oauthInfo = null;
                                                if (value) {
                                                    // log.debug('Refresh token obtained from redis:' +
                                                    //   '\nkey: ' + refreshTokenKey +
                                                    //   '\nvalue: ' + value);
                                                    logger.debug({
                                                        log: {
                                                            message: 'Refresh token obtained from redis',
                                                            key: key,
                                                            value: value
                                                        }
                                                    });
                                                    redisClient.disconnect();
                                                    oauthInfo = [
                                                        value,
                                                        storeConfigObject.get('posUrl')
                                                    ];
                                                    return q(oauthInfo);
                                                }
                                                else {
                                                    // log.debug(
                                                    //     'Refresh token not found in redis.' +
                                                    //     '\n\tLooking up refresh token from database: ' +
                                                    //     refreshTokenKey
                                                    // );
                                                    // log.debug('Refresh token will be stored in redis.');
                                                    logger.debug({log: {message: `Refresh token not found in redis. Looking up refresh token from database: ${refreshTokenKey}. Refresh token will be stored in redis.`}});
                                                    var validateRefreshToken = storeConfigObject.get('vendRefreshToken');
                                                    if (validateRefreshToken && validateRefreshToken.trim().length>0) {
                                                        redisClient.set(refreshTokenKey, storeConfigObject.get('vendRefreshToken'));
                                                        redisClient.disconnect();
                                                        //return storeConfigObject.get('vendRefreshToken');
                                                        oauthInfo = [
                                                            storeConfigObject.get('vendRefreshToken'),
                                                            storeConfigObject.get('posUrl')
                                                        ];
                                                        return q(oauthInfo);
                                                    }
                                                    else {
                                                        redisClient.disconnect();
                                                        return Parse.Promise.error({
                                                            message: 'No refresh token found in database! Please ask the retailer to authorize access via vend-login in the merchant-portal.',
                                                            'code': 404
                                                        });
                                                    }
                                                }
                                            });
                                    })
                                    .then(function (oauthInfo) {
                                        // log.debug('Requesting new access token from Vend using refresh token: ' + oauthInfo[0]);
                                        // log.debug('Getting posUrl for Vend to make accessToken Call: ' + oauthInfo[1]);
                                        logger.debug({log: {message: `Requesting new access token from Vend using refresh token: ${oauthInfo[0]}. Getting posUrl for Vend to make accessToken Call: ${oauthInfo[1]}`}});

                                        return vend.refreshAccessToken(
                                            oauthInfo[1] + '/api/1.0/token', // set tokenService
                                            nconf.get('vend:client_id'),
                                            nconf.get('vend:client_secret'),
                                            oauthInfo[0] // set refreshToken
                                            //domainPrefix // if the tokenService is an actual URL, then the domainPrefix (last argument) can be absent
                                        );
                                    })
                                    .then(function (response) {
                                            //var body = response.getBody();
                                            var body = response;
                                            // log.debug('Vend token response: ', body);
                                            logger.tag('Vend Response').debug({log: {message: 'Vend token response', body: body}});
                                            // log.debug('Access token will be stored in redis.');
                                            logger.info({log: {message: `Access token will be stored in redis`}});
                                            redisClient.setex(accessTokenKey, body.expires_in, body.access_token);
                                            redisClient.disconnect();

                                            //log.debug('Access token will be updated in loopback.');
                                            logger.info({log: {message: 'Access token will be updated in loopback.'}});
                                            return updateTokenDetails(storeConfigId, body.access_token)
                                                .then(function () {
                                                    return q(body.access_token); // return accessToken for caller to use
                                                });
                                        },
                                        function (error) {
                                            redisClient.disconnect();
                                            //log.error('Error fetching access token from Vend: ' + JSON.stringify(error));
                                            logger.error({err: error, message: 'Error fetching access token from Vend'});
                                            return q.reject(error);
                                        });
                            }
                        },
                        function (error) {
                            redisClient.disconnect();
                            //log.error('Error fetching access token from Redis or Vend: ' + JSON.stringify(error));
                            logger.error({err: error, message: 'Error fetching access token from Redis or Vend'});
                            return q.reject(error);
                        });
            },
            function (error) {
                redisClient.disconnect();
                //log.error('Error connecting to Redis: ' + error);
                logger.error({err: error, message: 'Error connecting to redis'});
                return q.reject(error);
            });
};

var getGlobalConfigValuesAsMap = function () {
    //console.log('inside getGlobalConfigValuesAsMap()');
    logger.tag('inside getGlobalConfigValuesAsMap()').info({log: {message: 'inside getGlobalConfigValuesAsMap()'}});
    var valuesToLookup = [].concat(_.values(arguments));
    return GlobalConfigModel.findOneAsync({})
        .then(function (globalConfig) {
            //console.log('inside getGlobalConfigValuesAsMap() - fetched globalConfig');
            logger.tag('getGlobalConfigValuesAsMap()').info({log: {message: 'inside getGlobalConfigValuesAsMap() - fetched globalConfig'}});
            var values = {};
            _.each(valuesToLookup, function (key) {
                values[key] = globalConfig[key];
                /*if (globalConfig[key] === undefined || globalConfig[key] === null) {
                 console.log('WARN: one or all of the following have not been configured - ' + valuesToLookup);
                 return Promise.reject({
                 code: 101,
                 message: 'WARN: one or all of the following have not been configured - ' + valuesToLookup
                 });
                 }*/
            });
            return Promise.resolve(values);
        });
};

var getVendConnectionInfo = function (orgModelId, options) {
    return fetchVendToken(orgModelId, options)
        .then(function () {
            return OrgModel.findById(orgModelId, {
                include: 'integrationModels'
            });
        })
        .catch(function (error) {
            logger.error({
                message: 'Could not fetch integration details of org',
                error,
                functionName: 'getVendConnectionInfo',
                options
            });
            return Promise.reject('Could not fetch integration details of org');
        })
        .then(function (orgModelInstance) {
            logger.debug({
                message: 'Found integration details, will return connectionInfo',
                orgModelInstance,
                functionName: 'getVendConnectionInfo',
                options
            });
            var vendConfig = OrgModel.app.get('integrations').vend;
            var connectionInfo = {
                domainPrefix: orgModelInstance.integrationModels()[0].domain_prefix,
                client_id: vendConfig.client_id,
                client_secret: vendConfig.client_secret,
                accessToken: orgModelInstance.integrationModels()[0].access_token
            };
            return Promise.resolve(connectionInfo);
        });
};


var getVendRegisters = function (storeConfigId) {
    // log.debug('getVendRegisters()');
    // log.debug('storeConfigId: ' + storeConfigId);
    logger.tag('getVendRegisters()').debug({log: {storeConfigId: storeConfigId}});
    // TODO: do we want to use redis? do we want to wire up vendSdk here?
    return getVendConnectionInfo(storeConfigId)
        .then(function (connectionInfo) {
            var argsForRegisters = vendSdk.args.registers.fetch();
            return vendSdk.registers.fetch(argsForRegisters, connectionInfo);
        })
        .then(function (registers) {
                //log.debug('Vend registers retrieved.\n', registers);
                logger.debug({log: {message: 'Vend registers retrieved', registers: registers}});
                return q(registers);
            },
            function (error) {
                //log.error('Error getting Vend registers:\n' + JSON.stringify(error));
                logger.error({err: error, message: 'Error getting Vend registers'});
                return q.reject('An error occurred while getting vend registers.\n' + JSON.stringify(error));
            });
};

var getVendOutlets = function (orgModelId, options) {
    logger.debug({
        message: 'Will fetch all vend outlets',
        functionName: 'getVendOutlets',
        options,
    });
    var token = null;

    return getVendConnectionInfo(orgModelId, options)
        .catch(function (error) {
            logger.error({
                message: 'Could not fetch integration details of org',
                error,
                functionName: 'getVendOutlets',
                options
            });
            return Promise.reject('Could not fetch integration details of org');
        })
        .then(function (connectionInfo) {
            logger.debug({
                message: 'Found connection info, will fetch vend outlets',
                functionName: 'getVendOutlets',
                options
            });
            var argsForOutlets = vendSdk.args.outlets.fetch();
            return vendSdk.outlets.fetchAll(argsForOutlets, connectionInfo);
        })
        .catch(function (error) {
            logger.error({
                message: 'Could not fetch vend outlets',
                errMessage: error,
                functionName: 'getVendOutlets',
                options
            });
            return Promise.reject('Could not fetch vend outlets');
        })
        .then(function (outlets) {
            logger.debug({
                message: 'Vend outlets retrieved',
                outlets: outlets,
                functionName: 'getVendOutlets',
                options
            });
            return Promise.resolve(outlets);
        });
};

var getVendProductTypes = function (orgModelId, options) {
    logger.debug({
        message: 'Will fetch all product types',
        functionName: 'getVendProductTypes',
        options,
    });
    var token = null;
    return getVendConnectionInfo(orgModelId, options)
        .catch(function (error) {
            logger.error({
                message: 'Could not fetch integration details of org',
                error,
                functionName: 'getVendProductTypes',
                options
            });
            return Promise.reject('Could not fetch integration details of org');
        })
        .then(function (connectionInfo) {
            logger.debug({
                message: 'Found connection info, will fetch vend product types',
                functionName: 'getVendProductTypes',
                options
            });
            var argsForProductTypes = vendSdk.args.productTypes.fetch();
            //change args to fetch all product types at once
            argsForProductTypes.after = 0;
            argsForProductTypes.pageSize = 1000;
            return vendSdk.productTypes.fetch(argsForProductTypes, connectionInfo);
        })
        .catch(function (error) {
            logger.error({
                message: 'Could not fetch vend product types',
                errMessage: error,
                functionName: 'getVendProductTypes',
                options
            });
            return Promise.reject('Could not fetch vend outlets');
        });
};

var getVendUsers = function (orgModelId, options) {
    logger.debug({
        message: 'Will fetch all vend users',
        functionName: 'getVendUsers',
        options,
    });
    var token = null;

    return getVendConnectionInfo(orgModelId, options)
        .catch(function (error) {
            logger.error({
                message: 'Could not fetch integration details of org',
                error,
                functionName: 'getVendUsers',
                options
            });
            return Promise.reject('Could not fetch integration details of org');
        })
        .then(function (connectionInfo) {
            logger.debug({
                message: 'Found connection info, will fetch vend users',
                functionName: 'getVendUsers',
                connectionInfo,
                options
            });
            var argsForUsers = vendSdk.args.users.fetchAll();
            return vendSdk.users.fetchAll(argsForUsers, connectionInfo);
        })
        .catch(function (error) {
            logger.error({
                message: 'Could not fetch vend users',
                errMessage: error,
                error,
                functionName: 'getVendUsers',
                options
            });
            return Promise.reject('Could not fetch vend users');
        })
        .then(function (users) {
            logger.debug({
                message: 'Vend users retrieved',
                users: users,
                functionName: 'getVendUsers',
                options
            });
            return Promise.resolve(users);
        });
};

var getVendSuppliers = function (orgModelId, options) {
    logger.debug({
        message: 'Will fetch all vend suppliers',
        functionName: 'getVendSuppliers',
        options,
    });
    var token = null;
    return getVendConnectionInfo(orgModelId, options)
        .catch(function (error) {
            logger.error({
                message: 'Could not fetch integration details of org',
                error,
                functionName: 'getVendUsers',
                options
            });
            return Promise.reject('Could not fetch integration details of org');
        })
        .then(function (connectionInfo) {
            logger.debug({
                message: 'Found connection info, will fetch vend users',
                functionName: 'getVendUsers',
                connectionInfo,
                options
            });
            var argsForSuppliers = vendSdk.args.suppliers.fetch();
            return vendSdk.suppliers.fetchAll(argsForSuppliers, connectionInfo);
        })
        .catch(function (error) {
            logger.error({
                message: 'Could not fetch vend suppliers',
                errMessage: error,
                functionName: 'getVendSuppliers',
                options
            });
            return Promise.reject('Could not fetch vend suppliers');
        })
        .then(function (suppliers) {
            logger.debug({
                message: 'Vend suppliers retrieved',
                suppliers: suppliers,
                functionName: 'getVendSuppliers',
                options
            });
            return Promise.resolve(suppliers);
        });
};

var getVendTaxes = function (storeConfigId) {
    // log.debug('getVendTaxes()');
    // log.debug('storeConfigId: ' + storeConfigId);
    logger.debug({log: {message: 'getVendTaxes()', storeConfigId: storeConfigId}});
    // TODO: do we want to use redis? do we want to wire up vendSdk here?
    return getVendConnectionInfo(storeConfigId)
        .then(function (connectionInfo) {
            var argsForTaxes = vendSdk.args.taxes.fetch();
            return vendSdk.taxes.fetch(argsForTaxes, connectionInfo);
        })
        .then(function (taxes) {
                //log.debug('Vend taxes retrieved.\n', taxes);
                logger.debug({log: {message: 'Vend taxes retrieved.', taxes: taxes}});
                return q(taxes);
            },
            function (error) {
                //log.error('Error getting Vend taxes:\n' + JSON.stringify(error));
                logger.error({err: error, message: 'Error getting Vend taxes'});
                return q.reject('An error occurred while getting vend taxes.\n' + JSON.stringify(error));
            });
};

var getVendPaymentTypes = function (storeConfigId) {
    // log.debug('getVendPaymentTypes()');
    // log.debug('storeConfigId: ' + storeConfigId);
    logger.debug({log: {message: 'getVendPaymentTypes()', storeConfigId: storeConfigId}});
    // TODO: do we want to use redis? do we want to wire up vendSdk here?
    return getVendConnectionInfo(storeConfigId)
        .then(function (connectionInfo) {
            var argsForPaymentTypes = vendSdk.args.paymentTypes.fetch();
            return vendSdk.paymentTypes.fetch(argsForPaymentTypes, connectionInfo);
        })
        .then(function (paymentTypes) {
                //log.debug('Vend paymentTypes retrieved.\n', paymentTypes);
                logger.debug({log: {message: 'Vend paymentTypes retrieved.', paymentTypes: paymentTypes}});
                return q(paymentTypes);
            },
            function (error) {
                //log.error('Error getting Vend paymentTypes:\n' + JSON.stringify(error));
                logger.error({err: error, message: 'Error getting Vend paymentTypes'});
                return q.reject('An error occurred while getting vend paymentTypes.\n' + JSON.stringify(error));
            });
};


var setDesiredStockLevelForVend = function (orgModelId, outletId, productId, desiredStockLevel, options) {
    logger.debug({
        message: 'Set desired stock level',
        orgModelId,
        options,
        productId,
        outletId,
        desiredStockLevel,
        functionName: 'setDesiredStockLevelForVend'
    });
    return getVendConnectionInfo(orgModelId, options)
        .catch(function (error) {
            logger.error({
                message: 'Could not fetch integration details of org',
                error,
                functionName: 'setDesiredStockLevelForVend',
                options
            });
            return Promise.reject('Could not fetch integration details of org');
        })
        .then(function (connectionInfo) {
            logger.debug({
                message: 'Fetched connection info, will update product',
                options,
                functionName: 'setDesiredStockLevelForVend'
            });
            var product = {
                id: productId //'3aab7379-15a2-11e3-a415-bc764e10976c'
            };
            var updateData = {
                id: product.id,
                inventory: [
                    {
                        'outlet_id': outletId, //'aea67e1a-b85c-11e2-a415-bc764e10976c',
                        'reorder_point': desiredStockLevel
                    }
                ]
            };
            return vendSdk.products.update({apiId: {value: product.id}, body: {value: updateData}}, connectionInfo);
        })
        .catch(function (error) {
            logger.error({
                message: 'Could not update product desired stock level',
                error,
                reason: error,
                functionName: 'setDesiredStockLevelForVend'
            });
            return Promise.reject('Could not update product desired stock level')
        })
        .then(function (response) {
            /*var miniProduct = response.product;
             if (miniProduct) {
             miniProduct = {
             id: response.product.id,
             handle: response.product.handle,
             name: response.product.name,
             sku: response.product.sku,
             inventory: _.find(response.product.inventory || [], function (inv) {
             return inv.outlet_id == outletId;
             }),
             updated_at: response.product.updated_at
             };
             }
             logger.debug({log: {message: 'Vend product updated.', miniProduct: miniProduct}});
             return q(response.product);
             },
             function (error) {
             //log.error('Error getting Vend product:\n' + JSON.stringify(error));
             logger.error({err: error, message: 'Error getting Vend product'});
             return q.reject('An error occurred while getting vend product.\n' + JSON.stringify(error));*/
            logger.debug({
                message: 'Updated vend product desired stock level successfully',
                response,
                functionName: 'setDesiredStockLevelForVend',
                options
            });
            return Promise.resolve('Updated vend product desired stock level successfully');
        });
};

var lookupBySku = function (sku, storeModelInstance, reportModelInstance) {
    var storeConfigId = storeModelInstance.storeConfigModelToStoreModelId;
    //log.debug('lookupBySku()', 'storeConfigId: ' + storeConfigId);
    logger.debug({log: {message: 'lookupBySku()', storeConfigId: storeConfigId}});
    return getVendConnectionInfo(storeConfigId)
        .then(function (connectionInfo) {
            return vendSdk.products.fetchBySku({sku: {value: sku}}, connectionInfo);
        })
        .catch(function (error) {
            if (error instanceof Error) {
                // log.error('lookupBySku()',
                //   'Error in Vend loopkup:',
                //   '\n', error.name + ':', error.message,
                //   '\n', error.stack);
                logger.error({err: error, message: 'Error in Vend lookup'});
            }
            else {
                //log.error('lookupBySku()', 'Error in Vend loopkup:\n' + JSON.stringify(error));
                logger.tag('lookupBySku()').error({err: error, message: 'Error in Vend loopkup'});
            }
            return Promise.reject('An error occurred while looking up a product in Vend.\n' + JSON.stringify(error));
        });
};

var createStockOrderForVend = function (storeModelInstance, reportModelInstance, supplierModelInstance, options) {
    var orgModelId = storeModelInstance.orgModelId;
    var reportName = reportModelInstance.name;
    var outletId = storeModelInstance.storeNumber;
    logger.debug({
        message: 'Will create stock order in vend',
        reportModelInstance,
        options,
        functionName: 'createStockOrderForVend'
    });
    return getVendConnectionInfo(orgModelId, options)
        .then(function (connectionInfo) {
            var argsForStockOrder = vendSdk.args.consignments.stockOrders.create();
            argsForStockOrder.name.value = reportName;
            argsForStockOrder.outletId.value = outletId;
            argsForStockOrder.supplierId.value = supplierModelInstance ? supplierModelInstance.api_id : null;
            logger.debug({
                message: 'Fetched connection info for vend, will create order in vend',
                options,
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
                options,
                functionName: 'createStockOrderForVend'
            });
            return Promise.reject('An error occurred while creating a stock order in Vend.\n' + JSON.stringify(error));
        })
        .then(function (newStockOrder) {
            logger.debug({
                message: 'Created stock order in vend',
                newStockOrder: newStockOrder,
                options,
                functionName: 'createStockOrderForVend'
            });
            return Promise.resolve(newStockOrder);
        });
};

var markStockOrderAsSent = function (storeModelInstance, reportModelInstance, options) {
    //log.debug('markStockOrderAsSent()', 'storeConfigId: ' + storeConfigId);
    logger.debug({log: {message: 'markStockOrderAsSent()', storeConfig: storeConfigId}});
    return getVendConnectionInfo(storeModelInstance.orgModelId, options)
        .then(function (connectionInfo) {
            var argsForStockOrder = vendSdk.args.consignments.stockOrders.markAsSent();
            argsForStockOrder.apiId.value = reportModelInstance.vendConsignmentId;
            argsForStockOrder.body.value = _.omit(reportModelInstance.vendConsignment, 'id');
            return vendSdk.consignments.stockOrders.markAsSent(argsForStockOrder, connectionInfo)
                .then(function (updatedStockOrder) {
                    //log.debug('markStockOrderAsSent()', 'updatedStockOrder', updatedStockOrder);
                    logger.tag('markStockOrderAsSent()').debug({log: {updatedStockOrder: updatedStockOrder}});
                    return Promise.resolve(updatedStockOrder);
                });
        })
        .catch(function (error) {
            if (error instanceof Error) {
                // log.error('markStockOrderAsSent()',
                //   'Error updating the stock order in Vend:',
                //   '\n', error.name + ':', error.message,
                //   '\n', error.stack);
                logger.error({err: error, message: 'Error updating the stock order in Vend'});
            }
            else {
                //log.error('markStockOrderAsSent()', 'Error updating the stock order in Vend:\n' + JSON.stringify(error));
                logger.tag('markStockOrderAsSent()').error({
                    err: error,
                    message: 'Error updating the stock order in Vend'
                });
            }
            return Promise.reject('An error occurred while updating the stock order in Vend.\n' + JSON.stringify(error));
        });
};

var markStockOrderAsReceived = function (storeModelInstance, reportModelInstance) {
    var storeConfigId = storeModelInstance.storeConfigModelToStoreModelId;
    //log.debug('markStockOrderAsReceived()', 'storeConfigId: ' + storeConfigId);
    logger.tag('markStockOrderAsReceived()').debug({log: {storeConfigId: storeConfigId}});
    return getVendConnectionInfo(storeConfigId)
        .then(function (connectionInfo) {
            var argsForStockOrder = vendSdk.args.consignments.stockOrders.markAsSent();
            argsForStockOrder.apiId.value = reportModelInstance.vendConsignmentId;
            argsForStockOrder.body.value = _.omit(reportModelInstance.vendConsignment, 'id');
            return vendSdk.consignments.stockOrders.markAsReceived(argsForStockOrder, connectionInfo)
                .then(function (updatedStockOrder) {
                    log.debug('markStockOrderAsReceived()', 'updatedStockOrder', updatedStockOrder);
                    return Promise.resolve(updatedStockOrder);
                });
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
};

var deleteStockOrder = function (storeModelInstance, reportModelInstance) {
    var storeConfigId = storeModelInstance.storeConfigModelToStoreModelId;
    //log.debug('deleteStockOrder()', 'storeConfigId: ' + storeConfigId);
    logger.tag('deleteStockOrder()').debug({log: {message: 'deleteStockOrder()', storeConfigId: storeConfigId}});
    return getVendConnectionInfo(storeConfigId)
        .then(function (connectionInfo) {
            var argsForStockOrder = vendSdk.args.consignments.stockOrders.remove();
            argsForStockOrder.apiId.value = reportModelInstance.vendConsignmentId;
            return vendSdk.consignments.stockOrders.remove(argsForStockOrder, connectionInfo)
                .then(function (updatedStockOrder) {
                    //log.debug('deleteStockOrder()', 'updatedStockOrder', updatedStockOrder);
                    logger.tag('deleteStockOrder()').debug({log: {updatedStockOrder: updatedStockOrder}});
                    return Promise.resolve(updatedStockOrder);
                });
        })
        .catch(function (error) {
            if (error instanceof Error) {
                // log.error('deleteStockOrder()',
                //   'Error deleting the stock order in Vend:',
                //   '\n', error.name + ':', error.message,
                //   '\n', error.stack);
                logger.tag('deleteStockOrder()').error({
                    err: error,
                    message: 'Error deleting the stock order in Vend'
                });
            }
            else {
                //log.error('deleteStockOrder()', 'Error deleting the stock order in Vend:\n' + JSON.stringify(error));
                logger.tag('deleteStockOrder()').error({
                    err: error,
                    message: 'Error deleting the stock order in Vend'
                });
            }
            return Promise.reject('An error occurred while deleting a stock order in Vend.\n' + JSON.stringify(error));
        });
};

var createStockOrderLineitemForVend = function (storeModelInstance, reportModelInstance, stockOrderLineitemModelInstance) {
    if (stockOrderLineitemModelInstance.vendConsignmentProductId) {
        //log.error('WARN: You are about to create a new vendConsignmentProduct even though one already exists!');
        logger.warn({log: {message: 'You are about to create a new vendConsignmentProduct even though one already exists!'}});
        return Promise.reject('WARN: You are about to create a new vendConsignmentProduct even though one already exists!');
    }
    var storeConfigId = storeModelInstance.storeConfigModelToStoreModelId;
    //log.debug('createStockOrderLineitemForVend()', 'storeConfigId: ' + storeConfigId);
    logger.tag('createStockOrderLineitemForVend()').debug({
        log: {
            message: 'createStockOrderLineitemForVend()',
            storeConfigId: storeConfigId
        }
    });
    return getVendConnectionInfo(storeConfigId)
        .then(function (connectionInfo) {
            var consignmentProduct = {
                //'sequence_number': 1,
                'consignment_id': reportModelInstance.vendConsignmentId,
                'product_id': stockOrderLineitemModelInstance.productId,
                'count': stockOrderLineitemModelInstance.orderQuantity,
                'cost': stockOrderLineitemModelInstance.supplyPrice,
                'received': stockOrderLineitemModelInstance.receivedQuantity
            };
            //log.debug('createStockOrderLineitemForVend()', 'consignmentProduct: ', consignmentProduct);
            logger.tag('createStockOrderLineitemForVend()').debug({
                log: {
                    message: 'createStockOrderLineitemForVend',
                    consignmentProduct: consignmentProduct
                }
            });
            return vendSdk.consignments.products.create({body: consignmentProduct}, connectionInfo)
                .then(function (newLineitem) {
                    //log.debug('newLineitem', newLineitem);
                    logger.tag('newLineItem').debug({log: {newLineitem: newLineitem}});
                    return Promise.resolve(newLineitem);
                });
        })
        .catch(function (error) {
            if (error instanceof Error) {
                // log.error('createStockOrderLineitemForVend()',
                //   'Error creating a stock order lineitem in Vend:',
                //   '\n', error.name + ':', error.message,
                //   '\n', error.stack);
                logger.error({err: error, message: 'Error creating a stock order lineitem in Vend'});
            }
            else {
                //log.error('createStockOrderLineitemForVend()', 'Error creating a stock order lineitem in Vend:\n' + JSON.stringify(error));
                logger.tag('createStockOrderLineitemForVend').error({
                    err: error,
                    message: 'Error creating a stock order lineitem in Vend'
                });
            }
            return Promise.reject('An error occurred while creating a stock order lineitem in Vend.\n' + JSON.stringify(error));
        });
};

var updateStockOrderLineitemForVend = function (storeModelInstance, reportModelInstance, stockOrderLineitemModelInstance) {
    var storeConfigId = storeModelInstance.storeConfigModelToStoreModelId;
    // log.debug('updateStockOrderLineitemForVend()', 'storeConfigId: ' + storeConfigId);
    logger.tag('updateStockOrderLineitemForVend()').debug({
        log: {
            message: 'updateStockOrderLineitemForVend()',
            storeConfigId: storeConfigId
        }
    });
    return getVendConnectionInfo(storeConfigId)
        .then(function (connectionInfo) {
            var args = vendSdk.args.consignments.products.update();
            args.apiId.value = stockOrderLineitemModelInstance.vendConsignmentProductId;
            //args.body.value = _.omit(stockOrderLineitemModelInstance.vendConsignmentProduct, 'id'); // omitting id is BAD in this case
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

var deleteStockOrderLineitemForVend = function (storeModelInstance, reportModelInstance, stockOrderLineitemModelInstance) {
    var storeConfigId = storeModelInstance.storeConfigModelToStoreModelId;
    //log.debug('deleteStockOrderLineitemForVend()', 'storeConfigId: ' + storeConfigId);
    logger.tag('deleteStockOrderLineitemForVend()').debug({
        log: {
            message: 'deleteStockOrderLineitemForVend()',
            storeConfigId: storeConfigId
        }
    });
    return getVendConnectionInfo(storeConfigId)
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
};

module.exports = function (dependencies) {
    if (dependencies) {
        OrgModel = dependencies.OrgModel;
    }

    return {
        updateTokenDetails: updateTokenDetails,
        token: token,
        getVendRegisters: getVendRegisters,
        getVendOutlets: getVendOutlets,
        getVendUsers: getVendUsers,
        getVendTaxes: getVendTaxes,
        getVendPaymentTypes: getVendPaymentTypes,
        getVendProductTypes: getVendProductTypes,
        setDesiredStockLevelForVend: setDesiredStockLevelForVend,
        lookupBySku: lookupBySku,
        createStockOrderForVend: createStockOrderForVend,
        markStockOrderAsSent: markStockOrderAsSent,
        markStockOrderAsReceived: markStockOrderAsReceived,
        deleteStockOrder: deleteStockOrder,
        createStockOrderLineitemForVend: createStockOrderLineitemForVend,
        updateStockOrderLineitemForVend: updateStockOrderLineitemForVend,
        deleteStockOrderLineitemForVend: deleteStockOrderLineitemForVend
    };
};
