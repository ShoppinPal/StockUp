var logger;
try {
  logger = require('sp-json-logger');
  var Promise = require('bluebird');
  var db = null; //database connected
  var ObjectId = require('mongodb').ObjectID;
  var _ = require('underscore');
  var utils = require('./../../jobs/utils/utils.js');
  var path = require('path');
  var MongoClient = require('mongodb').MongoClient;
  var vendSdk = require('vend-nodejs-sdk')({}); //why the {}?
  // Global variable for logging
  var commandName = path.basename(__filename, '.js'); // gives the filename without the .js extension
  var dbUrl = process.env.DB_URL;
}
catch (e) {
  logger.error({ message: 'Something went wrong while importing modules in fetch-differential-vend-data.js' });
  throw e;
}

var runMe = function (payload, config, taskId, messageId) {

  try {
    var vendConnectionInfo;
    var vendNewDataObjectVersions;


    logger.debug({
      messageId: messageId,
      commandName: commandName,
      payload: payload,
      config: config,
      taskId: taskId,
      argv: process.argv,
      env: process.env
    });

    try {
      process.env['User-Agent'] = taskId + ':' + messageId + ':' + commandName + ':' + payload.domainPrefix;
      logger.debug({ messageId: messageId, commandName: commandName, message: 'This worker will look for any change in the versions of following vendDataObjects', vendDataObjects: payload.vendDataObjects });
      return utils.savePayloadConfigToFiles(payload)
        .then(function () {
          //TODO: remove these relative paths
          var nconf = require('./../../node_modules/nconf/lib/nconf');
          nconf.file('client', {file: 'config/client.json'})
          //.file('settings', { file: 'config/settings.json' }) // NOTE: useful for quicker testing
            .file('oauth', {file: 'config/oauth.json'});
          logger.debug({ messageId: messageId, commandName: commandName, nconf: nconf.get() });
          vendConnectionInfo = utils.loadOauthTokens();
          return vendSdk.versions.fetchAll(vendConnectionInfo);
        })
        .then(function (versions) {
          logger.debug({ messageId: messageId, commandName: commandName, message: 'Found latest data object versions from vend', data: versions.data });
          logger.debug({ messageId: messageId, commandName: commandName, message: 'Will connect to the mongo database' });
          vendNewDataObjectVersions = versions.data;
          return MongoClient.connect(dbUrl, {promiseLibrary: Promise});
        })
        .then(function (dbInstance) {
          db = dbInstance;
          logger.debug({ messageId: messageId, commandName: commandName, message: 'Will look for properties which are set to sync in database' });
          return db.collection('SyncModel').find({
            $and: [{
              storeConfigModelId: ObjectId(payload.storeConfigModelId),

            },
              {
                name: {
                  $in: payload.vendDataObjects
                }
              }],
          }).toArray();
        })
        .then(function (syncModelInstances) {
          logger.debug({ messageId: messageId, commandName: commandName, message: 'Found following syncModels', syncModelInstances: syncModelInstances });
          payload.vendDataObjects = _.intersection(payload.vendDataObjects, _.pluck(syncModelInstances, 'name'));
          logger.debug({ messageId: messageId, commandName: commandName, message: 'Not all properties are set to sync yet, will try to sync only', vendDataObjects: payload.vendDataObjects });
          if (!payload.vendDataObjects.length || !syncModelInstances.length) {
            logger.debug({ messageId: messageId, commandName: commandName,message:  'Nothing to sync, will exit' });
            return Promise.reject('syncStatusSetToFalse');
          }
          /**
           * Logic to find which data object versions have changed since
           * the last sync, only those data objects will be fetched by
           * calling their corresponding fetch-workers
           */
          var differentialDataObjects = [];
          _.each(payload.vendDataObjects, function (eachVendDataObject) {
            var correspondingSyncModelInstance = _.find(syncModelInstances, function (eachSyncModel) {
              return eachSyncModel.name === eachVendDataObject;
            });
            if (correspondingSyncModelInstance.version !== undefined && vendNewDataObjectVersions[eachVendDataObject] !== correspondingSyncModelInstance.version) {
              differentialDataObjects.push({
                name: eachVendDataObject,
                versionsAfter: correspondingSyncModelInstance.version,
                versionsBefore: vendNewDataObjectVersions[eachVendDataObject]
              });
            }
          });
          logger.debug({ messageId: messageId, commandName: commandName, message: 'Some data objects differ in versions, will go on to fetch the required ones', differentialDataObjects: differentialDataObjects });
          if (differentialDataObjects.length>0) {
            return callFetchDataObjectsWorker(differentialDataObjects, payload, config, taskId, messageId);
          }
          else {
            logger.debug({ messageId: messageId, commandName: commandName, message: 'Vend data objects are up-to-date in warehouse, ending worker' });
            return Promise.reject('noDifferenceInDataVersions');
          }
        })
        .then(function (response) {
          logger.debug({ messageId: messageId, commandName: commandName, message: 'Finished calling the required worker, will exit now' });
          return Promise.resolve();
        })
        .catch(function (error) {
          if (error === 'noDifferenceInDataVersions') {
            return db.collection('SyncModel').updateMany({
              $and: [
                {
                  storeConfigModelId: ObjectId(payload.storeConfigModelId),
                },
                {
                  name: {
                    $in: payload.vendDataObjects
                  }
                }
              ],
            }, {
              $set: {
                syncInProcess: false,
                workerTaskId: '',
                lastSyncedAt: new Date()
              }
            });
          }
          else if (error === 'syncStatusSetToFalse') {
            return Promise.resolve();
          }
          else {
            logger.error({ messageId: messageId, commandName: commandName, message: 'Could not fetch data', err: error });
            return Promise.reject(error);
          }
        })
        .then(function (response) {
          logger.debug({ messageId: messageId, commandName: commandName, message: 'Everything is already in sync, updated sync models info', result: response ? response.result || response : '' });
          return Promise.resolve()
        })
        .finally(function () {
          logger.debug({ messageId: messageId, commandName: commandName, message: 'Closing database connection' });
          if (db) {
            return db.close();
          }
          return Promise.resolve();
        })
        .catch(function (error) {
          logger.error({ messageId: messageId, commandName: commandName, message: 'Could not close db connection', err: error });
          return Promise.resolve();
          //TODO: set a timeout, after which close all listeners
        });
    }
    catch (e) {
      logger.error({ messageId: messageId, commandName: commandName, message: '2nd last catch block', err: e });
      throw e;
    }
  }
  catch (e) {
    logger.error({ messageId: messageId, commandName: commandName, message: 'last catch block', err: e });
    throw e;
  }
};

var callFetchDataObjectsWorker = function (dataObjects, payload, config, taskId, messageId) {
  logger.debug({ messageId: messageId, commandName: commandName, message: 'inside callFetchDataObjectsWorker()' });
  if (dataObjects instanceof Array && dataObjects.length>0) {
    var dataObjectNames = _.pluck(dataObjects, 'name');
    var dataObjectIndices = {
      suppliers: dataObjectNames.indexOf('suppliers'),
      products: dataObjectNames.indexOf('products'),
      inventory: dataObjectNames.indexOf('inventory')
    };
    /**
     * Do not hamper the order here, it has been put in this way because:
     * 1) Supplier is not dependent on anything, so it goes first
     * 2) Product is dependent on suppliers, so it needs suppliers
     * 3) Inventory is dependent on products, so it needs products
     */
    return Promise.resolve()
      .then(function () {
        if (dataObjectIndices.suppliers !== -1) {
          logger.debug({ messageId: messageId, commandName: commandName, message: 'Calling fetch suppliers worker' });
          var refinedPayload = preparePayloadForWorker(dataObjects[dataObjectIndices.suppliers], payload, messageId);
          var fetchIncrementalSuppliers = require('./../fetch-incremental-suppliers/fetch-incremental-suppliers');
          return fetchIncrementalSuppliers.run(refinedPayload, config, taskId, messageId);
        }
        else {
          return Promise.resolve();
        }
      })
      .then(function () {
        if (dataObjectIndices.products !== -1) {
          logger.debug({ messageId: messageId, commandName: commandName, message: 'Calling fetch products worker' });
          var refinedPayload = preparePayloadForWorker(dataObjects[dataObjectIndices.products], payload, messageId);
          var fetchIncrementalProducts = require('./../fetch-incremental-products/fetch-incremental-products');
          return fetchIncrementalProducts.run(refinedPayload, config, taskId, messageId);
        }
        else {
          return Promise.resolve();
        }
      })
      .then(function () {
        if (dataObjectIndices.inventory !== -1) {
          logger.debug({ messageId: messageId, commandName: commandName, message: 'Calling fetch inventory worker' });
          var refinedPayload = preparePayloadForWorker(dataObjects[dataObjectIndices.inventory], payload, messageId);
          var fetchIncrementalSuppliers = require('./../fetch-incremental-inventory/fetch-incremental-inventory');
          return fetchIncrementalSuppliers.run(refinedPayload, config, taskId, messageId);
        }
        else {
          return Promise.resolve();
        }
      })
      .then(function () {
        logger.debug({ messageId: messageId, commandName: commandName, message: 'Will remove the sync models from database that aren\'t supported yet' });
        return Promise.map(dataObjects, function (eachDataObject) {
          if (_.keys(dataObjectIndices).indexOf(eachDataObject.name) === -1) {
            logger.debug({ messageId: messageId, commandName: commandName, message: `Removing ${eachDataObject.name}` });
            return db.collection('SyncModel').deleteOne({
              $and: [
                {
                  name: eachDataObject.name,
                },
                {
                  storeConfigModelId: ObjectId(payload.storeConfigModelId)
                }
              ],
            });
          }
          else {
            return Promise.resolve();
          }
        });
      })
      .then(function (response) {
        logger.debug({ messageId: messageId, commandName: commandName, message: 'Deleted the sync models that are not supported yet', result: response.result });
        return Promise.resolve();
      })
      .catch(function (error) {
        logger.error({ messageId: messageId, commandName: commandName, message: 'Something went wrong while calling workers', err: error });
        return Promise.reject(error);
      });
  }
};

var preparePayloadForWorker = function (eachDataObject, payload, messageId) {
  logger.debug({ messageId: messageId, commandName: commandName, message: 'inside preparePayloadForWorker()', eachDataObject: eachDataObject });
  return {
    tokenService: payload.tokenService,
    clientId: payload.clientId,
    clientSecret: payload.clientSecret,
    tokenType: payload.tokenType,
    accessToken: payload.accessToken,
    refreshToken: payload.refreshToken,
    domainPrefix: payload.domainPrefix,
    loopbackServerUrl: payload.loopbackServerUrl,
    loopbackAccessToken: payload.loopbackAccessToken,
    versionsAfter: eachDataObject.versionsAfter,
    versionsBefore: eachDataObject.versionsBefore,
    storeConfigModelId: payload.storeConfigModelId
  };
};

module.exports = {
  run: runMe
};
