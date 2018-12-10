var runMe = function (payload, config, taskId, messageId) {

  const logger = require('sp-json-logger');
  var dbUrl = process.env.DB_URL;

  try {
    var utils = require('./../../jobs/utils/utils.js');
    var path = require('path');
    var MongoClient = require('mongodb').MongoClient;
    var ObjectId = require('mongodb').ObjectID;
    var _ = require('underscore');
    var Promise = require('bluebird');
    var vendSdk = require('vend-nodejs-sdk')({}); //why the {}?
    var vendConnectionInfo;
    var db = null; //database connected
    var incrementalSuppliers, suppliersToDelete;

    // Global variable for logging
    var commandName = path.basename(__filename, '.js'); // gives the filename without the .js extension

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
      logger.debug({ messageId: messageId, commandName: commandName, message: 'This worker will fetch and save incremental suppliers from vend to warehouse' });
      return utils.savePayloadConfigToFiles(payload)
        .then(function () {
          //TODO: remove these relative paths
          var nconf = require('./../../node_modules/nconf/lib/nconf');
          nconf.file('client', {file: 'config/client.json'})
          //.file('settings', { file: 'config/settings.json' }) // NOTE: useful for quicker testing
            .file('oauth', {file: 'config/oauth.json'});
          logger.debug({ messageId: messageId, commandName: commandName, nconf: nconf.get() });
          vendConnectionInfo = utils.loadOauthTokens();
          var argsForSuppliers = vendSdk.args.suppliers.fetch();
          argsForSuppliers.after.value = payload.versionsAfter;
          argsForSuppliers.deleted.value = 1; //fetch all deleted suppliers also
          return vendSdk.suppliers.fetch(argsForSuppliers, vendConnectionInfo);
        })
        .then(function (fetchedSuppliers) {
          if (!fetchedSuppliers.data.length) {
            return Promise.reject('noIncrementalSuppliers');
          }
          suppliersToDelete = _.filter(fetchedSuppliers.data, function (eachSupplier) {
            return eachSupplier.deleted_at !== undefined && eachSupplier.deleted_at !== null;
          });
          incrementalSuppliers = _.difference(fetchedSuppliers.data, suppliersToDelete);
          logger.debug({ messageId: messageId, commandName: commandName, message: `Found ${suppliersToDelete.length} deleted suppliers, will delete them from the database` });
          logger.debug({ messageId: messageId, commandName: commandName, message: `Found ${incrementalSuppliers.length} new suppliers, will filter only required data from them` });
          return MongoClient.connect(dbUrl, {promiseLibrary: Promise});
        })
        .then(function (dbInstance) {
          logger.debug({messageId: messageId, commandName: commandName, message: 'Connected to mongodb database, will download suppliers into database'});
          db = dbInstance;
          //Initialize the unordered batch
          var batch = db.collection('SupplierModel').initializeUnorderedBulkOp();
          //Add some operations to be executed
          _.each(incrementalSuppliers, function (eachSupplier) {
            batch.find({
              api_id: eachSupplier.id
            }).upsert().updateOne({
              $set: {
                name: eachSupplier.name,
                api_id: eachSupplier.id,
                description: eachSupplier.description,
                storeConfigModelId: ObjectId(payload.storeConfigModelId)
              }
            });
          });
          _.each(suppliersToDelete, function (eachSupplier) {
            batch.find({
              api_id: eachSupplier.id
            }).remove({
              api_id: eachSupplier.id
            })
          });

          //Execute the operations
          return batch.execute();
        })
        .then(function (bulkInsertResponse) {
          var result = {
            ok: bulkInsertResponse.ok,
            nInserted: bulkInsertResponse.nInserted,
            nUpserted: bulkInsertResponse.nUpserted,
            nMatched: bulkInsertResponse.nMatched,
            nModified: bulkInsertResponse.nModified,
            nRemoved: bulkInsertResponse.nRemoved
          };
          logger.debug({ messageId: messageId, commandName: commandName, message: 'Bulk insert operation complete', result: result });
          logger.debug({ messageId: messageId, commandName: commandName, message: 'Will go on to update version no. in warehouse' });
          return db.collection('SyncModel').updateOne({
              $and: [
                {
                  'storeConfigModelId': ObjectId(payload.storeConfigModelId)
                },
                {
                  'name': 'suppliers'
                }
              ],
            },
            {
              $set: {
                'version': payload.versionsBefore,
                'syncInProcess': false,
                'workerTaskId': '',
                'lastSyncedAt': new Date()
              }
            });
        })
        .then(function (response) {
          logger.debug({ messageId: messageId, commandName: commandName, message: 'Updates suppliers version number in warehouse', result: response ? response.result || response : '' });
          return Promise.resolve();
        })
        .catch(function (error) {
          if (error === 'noIncrementalSuppliers') {
            logger.debug({ messageId: messageId, commandName: commandName, message: 'No incremental suppliers found, will exit' });
            return db.collection('SyncModel').updateOne({
                $and: [
                  {
                    'storeConfigModelId': ObjectId(payload.storeConfigModelId)
                  },
                  {
                    'name': 'suppliers'
                  }
                ],
              },
              {
                $set: {
                  'syncInProcess': false,
                  'workerTaskId': '',
                  'lastSyncedAt': new Date()
                }
              });
          }
          logger.error({ messageId: messageId, commandName: commandName, message: 'Could not fetch and save suppliers', err: error });
          return Promise.reject(error);
        })
        .then(function (response) {
          logger.debug({ messageId: messageId, commandName: commandName, message: 'Updated sync model for suppliers', result: response ? response.result || response: '' });
          return Promise.resolve();
        })
        .finally(function () {
          logger.debug({ messageId: messageId, commandName: commandName, message: 'Closing database connection' });
          if (db) {
            return db.close();
          }
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
    logger.error({ messageId: messageId, message: 'last catch block', err: e });
    throw e;
  }
};

module.exports = {
  run: runMe
};
