'use strict';
var Promise = require('bluebird');
var path = require('path');
var fileName = path.basename(__filename, '.js'); // gives the filename without the .js extension
var log = require('./../lib/debug-extension')('common:models:' + fileName);
var workers = require('./../utils/workers');
var logger = require('sp-json-logger');

module.exports = function (SyncModel) {

  SyncModel.initiateSync = function (id, names, cb) {
    var currentUser = SyncModel.getCurrentUserModel(cb); // returns  immediately if no currentUser
    // log('initiateSync').debug('Initiating sync for ', names);
    logger.tag('initiateSync').debug({
      log: {
        message: 'Initiating sync for',
        names: names
      }
    });
    var filter = {
      include: 'syncModels',
      scope: {
        where: {
          name: {
            inq: names
          }
        }
      }
    };
    var storeConfigInstance, syncModels, syncInProgressNames;

    return SyncModel.app.models.StoreConfigModel.findById(id, filter)
      .then(function (storeConfigModelInstance) {
        storeConfigInstance = storeConfigModelInstance;
        if (!storeConfigModelInstance) {
          // log('initiateSync').error('Could not find the organisation', id);
          logger.tag('initiateSync').debug({
            log: {
              message: 'Could not find the organisation',
              id: id
            }
          });
          return Promise.reject('Could not find your organisation');
        }
        else {
          // log('initiateSync').debug('Found this storeConfigModel', JSON.stringify(storeConfigModelInstance, null, 2));
          // log('initiateSync').debug('Found these sync models', storeConfigModelInstance.syncModels());
          logger.tag('initiateSync').debug({log: {
            message: 'Found following storeConfigModel and sync models',
            storeConfigModel: storeConfigModelInstance,
            syncModels: storeConfigModelInstance.syncModels()
          }});
          if (!storeConfigModelInstance.syncModels() || !storeConfigModelInstance.syncModels().length) {
            // log('initiateSync').debug('No sync models found for current org, will initiate sync models first');
            logger.tag('initiateSync').debug({log: {
              message: 'No sync models found for current org, will initiate sync models first'
            }});
            return Promise.map(names, function (eachName) {
              return SyncModel.create({
                name: eachName,
                version: 0,
                syncInProcess: false,
                storeConfigModelId: id
              });
            })
          }
          else {
            //TODO: reject the ones whose syncs are already in progress
            return Promise.resolve(storeConfigModelInstance.syncModels());
          }
        }
      })
      .then(function (response) {
        syncModels = response;
        // log('initiateSync').debug('Found the following sync versions', syncModels);
        logger.tag('initiateSync').debug({log: {
          message: 'Found the following sync versions',
          syncModels: syncModels
        }});
        var posUrl = storeConfigInstance.posUrl;
        var regexp = /^https?:\/\/(.*)\.vendhq\.com$/i;
        var matches = posUrl.match(regexp);
        var domainPrefix = matches[1];
        // log('initiateSync').debug('Creating new access token for workers');
        logger.tag('initiateSync').debug({log: {
          message: 'Creating new access token for workers'
        }});
        return Promise.all([currentUser.createAccessTokenAsync(1209600), domainPrefix]);// can't be empty ... time to live (in seconds) 1209600 is 2 weeks (default of loopback)
      })
      .then(function (response) {
        var newAccessToken = response[0];
        var domainPrefix = response[1];
        var payload = {
          op: SyncModel.app.get('findDifferentialVendData'),
          tokenService: 'https://{DOMAIN_PREFIX}.vendhq.com/api/1.0/token', //TODO: fetch from global-config or config.*.json
          clientId: SyncModel.app.get('vend').client_id,
          clientSecret: SyncModel.app.get('vend').client_secret,
          tokenType: 'Bearer',
          accessToken: storeConfigInstance.vendAccessToken,
          refreshToken: storeConfigInstance.vendRefreshToken,
          domainPrefix: domainPrefix, //'fermiyontest',
          loopbackServerUrl: process.env['site:baseUrl'] || SyncModel.app.get('site').baseUrl,
          loopbackAccessToken: newAccessToken, // let it be the full json object
          name: domainPrefix,
          vendDataObjects: names,
          storeConfigModelId: storeConfigInstance.id
        };
        return workers.sendPayLoad(payload);
      })
      .then(function (response) {
        // log('initiateSync').debug('Sent payload to worker to initiate sync, will update sync models with status');
        logger.tag('initiateSync').debug({log: {
          message: 'Sent payload to worker to initiate sync, will update sync models with status'
        }});
        return Promise.map(syncModels, function (eachModel) {
          return SyncModel.updateAll({
            name: eachModel.name
          }, {
            syncInProcess: true,
            workerTaskId: response.MessageId
          });
        });
      })
      .then(function (response) {
        // log('initiateSync').debug('Updated syncInProgress for ', names);
        logger.tag('initiateSync').debug({
          log: {
            message: 'Updated syncInProgress for:',
            name: names
          }
        });
        return Promise.resolve();
      })
      .catch(function (error) {
        // log('initiateSync').error('ERROR', error);
        logger.tag('initiateSync').error({
          error: error
        });
        return Promise.reject(error);
      });
  };

};
