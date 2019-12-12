const logger = require('sp-json-logger');
const maxBatchSize = 1000;
var suppliersBatchNumber = 0;
var path = require('path');
// Global variable for logging
var commandName = path.basename(__filename, '.js'); // gives the filename without the .js extension

var runMe = function (payload, config, taskId, messageId) {

  var dbUrl = process.env.DB_URL;

  try {
    var utils = require('./../../jobs/utils/utils.js');
    var MongoClient = require('mongodb').MongoClient;
    var ObjectId = require('mongodb').ObjectID;
    var _ = require('underscore');
    var Promise = require('bluebird');
    var vendConnectionInfo;
    var db = null; //database connected

    logger.debug({
      messageId: messageId,
      commandName: commandName,
      payload: payload,
      config: config,
      taskId: taskId,
      argv: process.argv
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
          return MongoClient.connect(dbUrl, {promiseLibrary: Promise});
        })
        .then(function (dbInstance) {
          logger.debug({messageId: messageId, commandName: commandName, message: 'Connected to mongodb database'});
          db = dbInstance;
          return fetchSuppliersRecursively(db, vendConnectionInfo, payload, messageId);
        })
        .then(function () {
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
              ]
            },
            {
              $set: {
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

function fetchSuppliersRecursively(dbInstance, vendConnectionInfo, payload, messageId) {
  suppliersBatchNumber++;
  var vendSdk = require('vend-nodejs-sdk')({}); //why the {}?
  var argsForSuppliers = vendSdk.args.suppliers.fetch();
  argsForSuppliers.after.value = payload.versionsAfter;
  argsForSuppliers.deleted.value = 1; //fetch all deleted suppliers also
  argsForSuppliers.pageSize.value = maxBatchSize;
  return vendSdk.suppliers.fetch(argsForSuppliers, vendConnectionInfo)
  .then(function (response) {
    if (response && response.data && response.data.length) {
      logger.debug({
        message: 'Fetched suppliers data from vend, will save to DB',
        suppliersCount: response.data.length,
        messageId: messageId,
        commandName: commandName,
        suppliersBatchNumber,
        functionName: 'fetchSuppliersRecursively'
      });
      return saveSuppliers(dbInstance, payload, vendConnectionInfo, response, messageId);
    }
    else if (response && response.data && !response.data.length) {
      logger.debug({
        message: 'No more suppliers to fetch, will exit worker',
        messageId: messageId,
        commandName: commandName,
        suppliersBatchNumber,
        functionName: 'fetchSuppliersRecursively'
      });
      return Promise.resolve('noIncrementalSuppliers');
    }
    else {
      logger.debug({
        message: 'Vend API returning null response',
        response,
        suppliersBatchNumber,
        messageId: messageId,
        commandName: commandName,
        functionName: 'fetchSuppliersRecursively'
      });
      return Promise.reject();
    }
    });
}

function saveSuppliers(dbInstance, payload, vendConnectionInfo, suppliers, messageId) {
  var suppliersToDelete = _.filter(suppliers.data, function (eachSupplier) {
    return eachSupplier.deleted_at !== undefined && eachSupplier.deleted_at !== null;
  });
  var suppliersToSave = _.difference(suppliers.data, suppliersToDelete);
  logger.debug({
    messageId: messageId,
    commandName: commandName,
    message: `Found ${suppliersToDelete.length} deleted suppliers, will delete them from the database`,
    suppliersBatchNumber,
    functionName: 'saveSuppliers'
  });
  logger.debug({
    messageId: messageId,
    commandName: commandName,
    message: `Found ${incrementalSuppliers.length} new suppliers, will filter only required data from them`,
    suppliersBatchNumber,
    functionName: 'saveSuppliers'
  });
  var batch = dbInstance.collection('SupplierModel').initializeUnorderedBulkOp();
  //Add some operations to be executed
  _.each(suppliersToSave, function (eachSupplier) {
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
  return executeBatch(batch)
    .catch(function (error) {
      logger.error({
        message: 'Could not execute batch operation, will exit',
        error,
        messageId: messageId,
        commandName: commandName,
        suppliersBatchNumber,
        functionName: 'saveSuppliers'
      });
      return Promise.reject();
    })
    .then(function () {
      logger.debug({
        messageId: messageId,
        commandName: commandName,
        message: 'Successfully executed batch of Suppliers, will update version number in DB',
        suppliersBatchNumber,
        functionName: 'saveSuppliers'
      });
      return dbInstance.collection('SyncModel').updateOne({
        $and: [
          {
            'storeConfigModelId': ObjectId(payload.storeConfigModelId)
          },
          {
            'name': 'suppliers'
          }
        ]
        },
        {
          $set: {
            'version': suppliers.version.max
          }
        });
      })
      .catch(function (error) {
        logger.error({
          messageId: messageId,
          commandName: commandName,
          message: 'Could not update version number in DB, will stop sync',
          error,
          suppliersBatchNumber,
          functionName: 'saveSuppliers'
        });
        return Promise.reject('Could not update version number in DB, will stop sync');
      })
      .then(function () {
        payload.versionsAfter = suppliers.version.max;
        return fetchSuppliersRecursively(dbInstance, vendConnectionInfo, payload, messageId);
      });
}

function executeBatch(batch) {
  return new Promise(function (resolve, reject) {
    logger.debug({ message: `Executing batch of suppliers`, suppliersBatchNumber, functionName: 'executeBatch' });
    if (batch.s && batch.s.currentBatch && batch.s.currentBatch.operations) {
      batch.execute(function (err, result) {
        if (err) {
          logger.error({ message: `ERROR in batch `, err: err, suppliersBatchNumber, functionName: 'executeBatch' });
          reject(err);
        }
        else {
          logger.debug({
            message: `Successfully executed batch with ${batch.s.currentBatch.operations.length} operations`,
            suppliersBatchNumber,
            "nInserted": result.nInserted,
            "nUpserted": result.nUpserted,
            "nMatched": result.nMatched,
            "nModified": result.nModified,
            "nRemoved": result.nRemoved,
            functionName: 'executeBatch'
          });
          resolve('Executed');
        }
      });
    }
    else {
      logger.debug({ message: `Skipping empty batch ${suppliersBatchNumber}`, functionName: 'executeBatch' });
      resolve('Skipped');
    }
  });
}
