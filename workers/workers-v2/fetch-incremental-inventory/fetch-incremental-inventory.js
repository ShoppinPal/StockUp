const logger = require('sp-json-logger');
const maxBatchSize=1000;
var inventoryBatchNumber = 0;
var path = require('path');
var commandName = path.basename(__filename, '.js'); // gives the filename without the .js extension

var runMe = function (payload, config, taskId, messageId) {

  var dbUrl = process.env.DB_URL;

  try {
    var utils = require('./../../jobs/utils/utils.js');
    var MongoClient = require('mongodb').MongoClient;
    var ObjectId = require('mongodb').ObjectID;
    var _ = require('underscore');
    var Promise = require('bluebird');
    var db = null; //database connected
    var vendConnectionInfo;

    // Global variable for logging

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
      logger.debug({messageId: messageId, commandName: commandName, message: 'This worker will fetch and save incremental suppliers from vend to warehouse'});

      return utils.savePayloadConfigToFiles(payload)
        .then(function () {
          //TODO: remove these relative paths
          var nconf = require('./../../node_modules/nconf/lib/nconf');
          nconf.file('client', {file: 'config/client.json'})
          //.file('settings', { file: 'config/settings.json' }) // NOTE: useful for quicker testing
                  .file('oauth', {file: 'config/oauth.json'});
          logger.debug({messageId: messageId, commandName: commandName, nconf: nconf.get()});
          vendConnectionInfo = utils.loadOauthTokens();
          return MongoClient.connect(dbUrl, {promiseLibrary: Promise});
        })
        .then(function (dbInstance) {
          logger.debug({messageId: messageId, commandName: commandName, message: 'Connected to mongodb database'});
          db = dbInstance;
          return fetchInventoryRecursively(db, vendConnectionInfo, payload, messageId);
        })
        .then(function () {
          logger.debug({ messageId: messageId, commandName: commandName, message: 'Bulk insert operation complete' });
          logger.debug({ messageId: messageId, commandName: commandName, message: 'Will go on to update version no. in warehouse' });
          return db.collection('SyncModel').updateOne({
            $and: [
              {
                'storeConfigModelId': ObjectId(payload.storeConfigModelId)
              },
              {
                'name': 'inventory'
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
        .then(function (res) {
          logger.debug({ messageId: messageId, commandName: commandName, message: 'Updated inventory sync status in warehouse' });
          return Promise.resolve();
        })
        .catch(function (error) {
          logger.error({ messageId: messageId, commandName: commandName, message: 'Could not fetch and save inventory', err: error });
          return Promise.reject(error);
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

function fetchInventoryRecursively(dbInstance, vendConnectionInfo, payload, messageId) {
  inventoryBatchNumber++;
  var vendSdk = require('vend-nodejs-sdk')({}); //kamal: why the {}?
  var argsForInventory = vendSdk.args.inventory.fetch();
  argsForInventory.after.value = payload.versionsAfter;
  argsForInventory.pageSize.value = maxBatchSize;
  return vendSdk.inventory.fetch(argsForInventory, vendConnectionInfo)
    .then(function (response) {
      if (response && response.data && response.data.length) {
        logger.debug({
          message: 'Fetched inventory data from vend, will save to DB',
          inventoryCount: response.data.length,
          messageId: messageId,
          commandName: commandName,
          inventoryBatchNumber,
          functionName: 'fetchInventoryRecursively'
        });
        return saveInventory(dbInstance, payload, vendConnectionInfo, response, messageId);
      }
      else if (response && response.data && !response.data.length) {
        logger.debug({
          message: 'No more inventory to fetch, will exit worker',
          messageId: messageId,
          commandName: commandName,
          inventoryBatchNumber,
          functionName: 'fetchInventoryRecursively'
        });
        return Promise.resolve('noIncrementalInventory');
      }
      else {
        logger.debug({
          message: 'Vend API returning null response',
          response,
          inventoryBatchNumber,
          messageId: messageId,
          commandName: commandName,
          functionName: 'fetchInventoryRecursively'
        });
        return Promise.reject();
      }
    });
}

function saveInventory(dbInstance, payload, vendConnectionInfo, inventory, messageId) {
  var productIds = _.uniq(_.pluck(inventory.data, 'product_id'));
  var outletIds = _.uniq(_.pluck(inventory.data, 'outlet_id'));
  var inventoryToDelete = _.filter(inventory.data, function (eachInventory) {
    return eachInventory.deleted_at !== undefined && eachInventory.deleted_at !== null;
  });
  var inventoryToSave = _.difference(inventory.data, inventoryToDelete);
  return Promise.all([
    db.collection('ProductModel').find({
      "storeConfigModelId": ObjectId(payload.storeConfigModelId),
      "api_id": {
        $in: productIds
      }
    }).toArray(),
    db.collection('StoreModel').find({
      "storeConfigModelToStoreModelId": ObjectId(payload.storeConfigModelId),
      "api_id": {
        $in: outletIds
      }
    }).toArray()
  ])
    .then(function (response) {
      var productModelInstances = response[0];
      var storeModelInstances = response[1];
      logger.debug({
        messageId: messageId,
        commandName: commandName,
        message: `Found product model instances ${productModelInstances.length}`,
        inventoryBatchNumber,
        functionName: 'saveInventory'
      });
      logger.debug({
        messageId: messageId,
        commandName: commandName,
        message: `Found store model instances ${storeModelInstances.length}`,
        inventoryBatchNumber,
        functionName: 'saveInventory'
      });
      logger.debug({
        messageId: messageId,
        commandName: commandName,
        message: 'Will attach stores and products to inventory',
        inventoryBatchNumber,
        functionName: 'saveInventory'
      });

      var batch = db.collection('InventoryModel').initializeUnorderedBulkOp();
      var invalidInventoryCounter = 0;
      //Add some operations to be executed
      _.each(inventoryToSave, function (eachInventory) {
        var productModelToAttach = _.findWhere(productModelInstances, {api_id: eachInventory.product_id});
        var storeModelToAttach = _.findWhere(storeModelInstances, {api_id: eachInventory.outlet_id});
        if (productModelToAttach && storeModelToAttach) {
          batch.find({
            api_id: eachInventory.id
          }).upsert().updateOne({
            $set: {
              api_id: eachInventory.id,
              productModelId: productModelToAttach ? productModelToAttach._id : null,
              storeModelId: storeModelToAttach ? storeModelToAttach._id : null,
              product_id: eachInventory.product_id,
              outlet_id: eachInventory.outlet_id,
              inventory_level: eachInventory.inventory_level,
              reorder_point: eachInventory.reorder_point,
              reorder_amount: eachInventory.reorder_amount,
              storeConfigModelId: ObjectId(payload.storeConfigModelId),
              updatedAt: new Date()
            }
          });
        }
        else {
          logger.debug({
            messageId: messageId,
            commandName: commandName,
            message: 'Could not find a store or product for this inventory',
            eachInventory,
            inventoryBatchNumber,
            functionName: 'saveInventory'
          });
          invalidInventoryCounter++;
        }
      });
      _.each(inventoryToDelete, function (eachInventory) {
        batch.find({
          api_id: eachInventory.id
        }).remove({
          api_id: eachInventory.id
        });
      });
      //Execute the operations
      logger.debug({
        messageId: messageId,
        commandName: commandName,
        message: `Attached stores and products, will download the inventory`,
        invalidInventoryCount: invalidInventoryCounter,
        inventoryBatchNumber,
        functionName: 'saveInventory'
      });
      return executeBatch(batch);
    })
    .catch(function (error) {
      logger.error({
        message: 'Could not execute batch operation, will exit',
        error,
        inventoryBatchNumber,
        functionName: 'saveInventory'
      });
      return Promise.reject();
    })
    .then(function () {
      logger.debug({
          message: 'Successfully executed batch of Inventory, will update version number in DB',
          inventoryBatchNumber,
          functionName: 'saveInventory'
      });
      return db.collection('SyncModel').updateOne({
          $and: [
            {
              'storeConfigModelId': ObjectId(payload.storeConfigModelId)
            },
            {
              'name': 'inventory'
            }
          ]
        },
        {
          $set: {
            'version': inventory.version.max
          }
        });
      })
      .catch(function (error) {
          logger.error({
              message: 'Could not update version number in DB, will stop sync',
              error,
              inventoryBatchNumber,
              functionName: 'saveInventory'
          });
          return Promise.reject('Could not update version number in DB, will stop sync');
      })
      .then(function () {
        payload.versionsAfter = inventory.version.max;
        return fetchInventoryRecursively(dbInstance, vendConnectionInfo, payload, messageId);
      });
}

function executeBatch(batch) {
  return new Promise(function (resolve, reject) {
    logger.debug({ message: `Executing batch of inventory`, inventoryBatchNumber, functionName: 'executeBatch' });
    if (batch.s && batch.s.currentBatch && batch.s.currentBatch.operations) {
      batch.execute(function (err, result) {
        if (err) {
          logger.error({ message: `ERROR in batch `, err: err, inventoryBatchNumber, functionName: 'executeBatch' });
          reject(err);
        }
        else {
          logger.debug({
            message: `Successfully executed batch with ${batch.s.currentBatch.operations.length} operations`,
            inventoryBatchNumber,
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
      logger.debug({ message: `Skipping empty batch ${inventoryBatchNumber}`, functionName: 'executeBatch' });
      resolve('Skipped');
    }
  });
}
