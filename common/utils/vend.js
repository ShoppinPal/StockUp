'use strict';

var GlobalConfigModel = null;
var StoreConfigModel = null;
var currentUser = null;

var _ = require('underscore')
  , q = require('q')
  , Promise = require('bluebird')// TODO: stick to one promise library: Q or bluebird
  , vendSdk = require('vend-nodejs-sdk')({});

var logger = require('debug');
var debug = logger('shoppinpal:utils:vend:debug'); // by default console.log is used
var error = logger('shoppinpal:utils:vend:error'); // set this namespace to log via console.error
error.log = console.error.bind(console); // don't forget to bind to console!

var log = {
  debug: debug,
  error: error
};

/**
 *
 * @param storeConfigId
 * @param accessToken
 * @returns {*} - a promise but no value
 */
var updateTokenDetails = function(storeConfigId, accessToken){
  // NOTE: StoreConfigModel on the server side doesn't have ACL
  //       rules applied to it so its always in "master" mode
  return StoreConfigModel.updateAsync(
    {objectId:Number(storeConfigId)}, // where
    {vendAccessToken: accessToken}// data
  );
};

// This backend is now responsible for saving a new instance of storeConfig for Vend POS.
var saveTokenDetails = function(accessToken, refreshToken, domainPrefix, sessionToken){
  // TODO: if this is exposed via remote method then there is no need to validate token as ACLs would have done it
  //       the remote method we call on StoreConfigModel can discover the currentUser instance from sessionToken
  //       so that related models can have it as their $owner

  var storeConfigModel = Promise.promisifyAll(
    currentUser.storeConfigModels,
    {
      filter: function(name, func, target){
        return !( name == 'validate');
      }
    }
  );

  return storeConfigModel.createAsync({
    // TODO: retailers in MP should not be able to fetch the oauth info,
    //       otherwise they can make calls and claim that it was ShoppinPal
    vendAccessToken: accessToken,
    vendRefreshToken: refreshToken,
    posUrl: 'https://'+ domainPrefix +'.vendhq.com',
    posVendor: 'vend',
    productImportRules: {
      'op':'AND',
      'rules':[
        {
          'applyTo':'inventory',
          'condition':'greaterThan',
          'field':'count',
          'values':['0']
        },
        {
          'condition': 'doesNotExist',
          'field': 'variant_parent_id'
        },
        {
          'condition':'doesNotContainSubString',
          'field':'image',
          'skipIfFieldExists': 'variant_parent_id',
          'values':[
            'images/placeholder/product/no-image-white-original.png',
            'images/placeholder/product/no-image-white-thumb.png',
            'images/placeholder/uploading/uploading-white-original.gif',
            'images/placeholder/uploading/uploading-white-thumb.gif'
          ]
        }
      ]
    }
  })
    .then(function(storeConfig) {
      debug('created storeConfig w/ objectId: ' + storeConfig.objectId);
      return q(storeConfig);
    });
};

//TODO: accept currentUser as a method argument!
var token = function(code, domainPrefix, state, /*baseUrl,*/ restApiRoot, vendConfig){
  /* jshint camelcase: false */
  var vendAccessToken = null;
  var vendRefreshToken = null;
  var vendDomainPrefix = null;

  log.debug('inside token():' +
    '\n code: ' + code +
    '\n domainPrefix: ' + domainPrefix +
    '\n state ' + state + // user's authN session token
    //'\n baseUrl ' + baseUrl +
    '\n restApiRoot ' + restApiRoot +
    '\n vendConfig ' + JSON.stringify(vendConfig,null,2)
  );
  var userSessionToken = state;

  // redirectUri is required again by Vend as a security check, not for actual use
  var redirectUri = process.env['site:baseUrl'] + restApiRoot +'/StoreConfigModels/token/vend';
  log.debug('redirectUri: '+ redirectUri);
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
    .then(function(response){
      log.debug('Vend Token Details ' + JSON.stringify(response,null,2));
      vendAccessToken = response.access_token;
      vendRefreshToken = response.refresh_token;
      vendDomainPrefix = response.domain_prefix;
      return saveTokenDetails(vendAccessToken,vendRefreshToken,vendDomainPrefix,userSessionToken);
    })
    .then(function(storeConfigObject){
      var redirectToThisUrl = process.env['site:baseUrl'] +
        '/#/onboarding' +
        '/' + storeConfigObject.objectId +
        '/vend';
      log.debug('redirecting to: ' + redirectToThisUrl);
      return q(redirectToThisUrl);
    }
    ,function(error){
      log.error('Error receiving token information: ', JSON.stringify(error));
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
  log.debug('getAccessToken():' +
      '\n\tstoreConfigId: ' + storeConfigId
  );

  var accessTokenKey = 'vend_access_token:' + storeConfigId;
  var refreshTokenKey = 'vend_refresh_token:' + storeConfigId;

  return redisClient.connect()
    .then(function(){
      if(storeConfigId) {
        log.debug('getAccessToken():' +
          '\n\tUsing passed in storeConfigId');
        return q(storeConfigId);
      }

      return q.reject('No storeConfigId was passed in.'); //TODO: move it to the very beginning of this method
    })
    .then(function(storeConfigId){
      log.debug('Store config id from promise is: ' + storeConfigId);
      accessTokenKey = 'vend_access_token:' + storeConfigId;
      refreshTokenKey = 'vend_refresh_token:' + storeConfigId;

      return redisClient.get(accessTokenKey)
        .then(function(value) {
          if(value) {
            log.debug('Access token obtained from redis:' +
              '\n\tkey: ' + accessTokenKey +
              '\n\tvalue: ' + value);
            redisClient.disconnect();
            return q(value);
          }
          else {
            log.debug('Access token not found in redis.');
            return redisClient.get(refreshTokenKey)
              .then(function(value) {
                StoreConfigModel.findOneAsync(
                  {filter:{where: {id: value}}}
                )
                  .then(function(storeConfigObject){
                    var oauthInfo = null;
                    if(value) {
                      log.debug('Refresh token obtained from redis:' +
                        '\nkey: ' + refreshTokenKey +
                        '\nvalue: ' + value);
                      redisClient.disconnect();
                      oauthInfo = [
                        value,
                        storeConfigObject.get('posUrl')
                      ];
                      return q(oauthInfo);
                    }
                    else {
                      log.debug(
                          'Refresh token not found in redis.' +
                          '\n\tLooking up refresh token from database: ' +
                          refreshTokenKey
                      );
                      log.debug('Refresh token will be stored in redis.');
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
              .then(function(oauthInfo) {
                log.debug('Requesting new access token from Vend using refresh token: ' + oauthInfo[0]);
                log.debug('Getting posUrl for Vend to make accessToken Call: ' + oauthInfo[1]);

                return vend.refreshAccessToken(
                    oauthInfo[1]+'/api/1.0/token', // set tokenService
                  nconf.get('vend:client_id'),
                  nconf.get('vend:client_secret'),
                  oauthInfo[0] // set refreshToken
                  //domainPrefix // if the tokenService is an actual URL, then the domainPrefix (last argument) can be absent
                );
              })
              .then(function(response){
                //var body = response.getBody();
                var body = response;
                log.debug('Vend token response: ', body);

                log.debug('Access token will be stored in redis.');
                redisClient.setex(accessTokenKey, body.expires_in, body.access_token);
                redisClient.disconnect();

                log.debug('Access token will be updated in parse.');
                return updateTokenDetails(storeConfigId, body.access_token)
                  .then(function() {
                    return q(body.access_token); // return accessToken for caller to use
                  });
              },
              function(error){
                redisClient.disconnect();
                log.error('Error fetching access token from Vend: ' + JSON.stringify(error));
                return q.reject(error);
              });
          }
        },
        function(error){
          redisClient.disconnect();
          log.error('Error fetching access token from Redis or Vend: ' + JSON.stringify(error));
          return q.reject(error);
        });
    },
    function(error){
      redisClient.disconnect();
      log.error('Error connecting to Redis: ' + error);
      return q.reject(error);
    });
};

var getGlobalConfigValuesAsMap = function() {
  console.log('inside getGlobalConfigValuesAsMap()');
  var valuesToLookup = [].concat(_.values(arguments));
  return GlobalConfigModel.findOneAsync({})
    .then(function(globalConfig) {
      console.log('inside getGlobalConfigValuesAsMap() - fetched globalConfig');
      var values = {};
      _.each(valuesToLookup, function(key){
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

var getVendConnectionInfo = function(storeConfigId) {
  return StoreConfigModel.findOneAsync(
    {where: {objectId: storeConfigId}}
  )
    .then(function(storeConfig){
      try {
        //console.log(storeConfig);
        //console.log('inside getVendConnectionInfo()');
        var posUrl = storeConfig.posUrl;
        var regexp = /^https?:\/\/(.*)\.vendhq\.com$/i;
        var matches = posUrl.match(regexp);
        if(matches) {
          //console.log('matches: ', matches);
          //console.log('domainPrefix: ', matches[1]);
          var vendConnectionInfo = {
            domainPrefix: matches[1],
            accessToken: storeConfig.vendAccessToken,
            refreshToken: storeConfig.vendRefreshToken
          };
          // need additional info to allow for accessToken to be reissues on 401 event
          //console.log('vendConnectionInfo BEFORE extending w/ globalConfig: ', vendConnectionInfo);
          return getGlobalConfigValuesAsMap('vendClientId','vendClientSecret','vendTokenService')
            .then(function(valuesAsMap){
              vendConnectionInfo = _.extend(vendConnectionInfo, valuesAsMap);
              console.log('vendConnectionInfo AFTER extending w/ globalConfig: ', vendConnectionInfo);
              return vendConnectionInfo;
            });
        }
        else {
          return Promise.resolve({}); // empty
        }
      }
      catch(exception){
        console.log('inside getVendConnectionInfo() - caught an exception');
        console.log(exception);
        return Promise.reject(exception);
      }
    });
};

var getVendRegisters = function(storeConfigId){
  log.debug('getVendRegisters()');
  log.debug('storeConfigId: ' + storeConfigId);
  // TODO: do we want to use redis? do we want to wire up vendSdk here?
  return getVendConnectionInfo(storeConfigId)
    .then(function(connectionInfo){
      var argsForRegisters = vendSdk.args.registers.fetch();
      return vendSdk.registers.fetch(argsForRegisters,connectionInfo);
    })
    .then(function(registers) {
      log.debug('Vend registers retrieved.\n', registers);
      return q(registers);
    },
    function(error){
      log.error('Error getting Vend registers:\n' + JSON.stringify(error));
      return q.reject('An error occurred while getting vend registers.\n' + JSON.stringify(error));
    });
};

var getVendOutlets = function(storeConfigId){
  log.debug('getVendOutlets()');
  log.debug('storeConfigId: ' + storeConfigId);
  // TODO: do we want to use redis? do we want to wire up vendSdk here?
  return getVendConnectionInfo(storeConfigId)
    .then(function(connectionInfo){
      var argsForOutlets = vendSdk.args.outlets.fetch();
      return vendSdk.outlets.fetch(argsForOutlets,connectionInfo);
    })
    .then(function(outlets) {
      log.debug('Vend outlets retrieved.\n', outlets);
      return q(outlets);
    },
    function(error){
      log.error('Error getting Vend outlets:\n' + JSON.stringify(error));
      return q.reject('An error occurred while getting vend outlets.\n' + JSON.stringify(error));
    });
};

var getVendTaxes = function(storeConfigId){
  log.debug('getVendTaxes()');
  log.debug('storeConfigId: ' + storeConfigId);
  // TODO: do we want to use redis? do we want to wire up vendSdk here?
  return getVendConnectionInfo(storeConfigId)
    .then(function(connectionInfo){
      var argsForTaxes = vendSdk.args.taxes.fetch();
      return vendSdk.taxes.fetch(argsForTaxes,connectionInfo);
    })
    .then(function(taxes) {
      log.debug('Vend taxes retrieved.\n', taxes);
      return q(taxes);
    },
    function(error){
      log.error('Error getting Vend taxes:\n' + JSON.stringify(error));
      return q.reject('An error occurred while getting vend taxes.\n' + JSON.stringify(error));
    });
};

var getVendPaymentTypes = function(storeConfigId){
  log.debug('getVendPaymentTypes()');
  log.debug('storeConfigId: ' + storeConfigId);
  // TODO: do we want to use redis? do we want to wire up vendSdk here?
  return getVendConnectionInfo(storeConfigId)
    .then(function(connectionInfo){
      var argsForPaymentTypes = vendSdk.args.paymentTypes.fetch();
      return vendSdk.paymentTypes.fetch(argsForPaymentTypes,connectionInfo);
    })
    .then(function(paymentTypes) {
      log.debug('Vend paymentTypes retrieved.\n', paymentTypes);
      return q(paymentTypes);
    },
    function(error){
      log.error('Error getting Vend paymentTypes:\n' + JSON.stringify(error));
      return q.reject('An error occurred while getting vend paymentTypes.\n' + JSON.stringify(error));
    });
};

module.exports = function(dependencies){
  if (dependencies) {
    GlobalConfigModel = dependencies.GlobalConfigModel;
    StoreConfigModel = dependencies.StoreConfigModel;
    currentUser = dependencies.currentUser; // TODO: will this lead to issues due to concurrency or module caching?
  }

  return {
    updateTokenDetails: updateTokenDetails,
    token: token,
    getVendRegisters: getVendRegisters,
    getVendOutlets: getVendOutlets,
    getVendTaxes: getVendTaxes,
    getVendPaymentTypes: getVendPaymentTypes
  };
};
