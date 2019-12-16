const logger = require('sp-json-logger');
const maxBatchSize = 1000;
var productsBatchNumber = 0;
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
      logger.debug({ messageId: messageId, commandName: commandName, message: 'This worker will fetch and save incremental products from vend to warehouse' });
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
          return fetchProductsRecursively(db, vendConnectionInfo, payload, messageId);
        })
        .then(function () {
          logger.debug({ messageId: messageId, commandName: commandName, message: 'Bulk insert operation complete'});
          logger.debug({ messageId: messageId, commandName: commandName, message: 'Will go on to update sync status in warehouse' });
          return db.collection('SyncModel').updateOne({
            $and: [
              {
                'storeConfigModelId': ObjectId(payload.storeConfigModelId)
              },
              {
                'name': 'products'
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
          logger.debug({ messageId: messageId, commandName: commandName, message: 'Updated product sync status', result: response ? response.result || response : '' });
          return Promise.resolve();
        })
        .catch(function (error) {
          logger.error({ messageId: messageId, commandName: commandName, message: 'Could not fetch and save products', err: error });
          return Promise.reject(error);
        })
        .then(function (response) {
          logger.debug({ messageId: messageId, commandName: commandName, message: 'Updated sync model for products', result: response ? response.result || response : '' });
          return Promise.resolve();
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
    logger.error({ messageId: messageId, message: 'last catch block', err: e });
    throw e;
  }
};

module.exports = {
  run: runMe
};

function fetchProductsRecursively(dbInstance, vendConnectionInfo, payload, messageId) {
  productsBatchNumber++;
  var vendSdk = require('vend-nodejs-sdk')({}); // why the {}?
  var argsForProducts = vendSdk.args.products.fetch();
  argsForProducts.after.value = payload.versionsAfter;
  argsForProducts.pageSize.value = maxBatchSize;
  argsForProducts.deleted.value = 1; //fetch all deleted products also
  return vendSdk.products.fetch(argsForProducts, vendConnectionInfo)
    .then(function (response) {
      if (response && response.data && response.data.length) {
        logger.debug({
          message: 'Fetched products data from vend, will save to DB',
          productsCount: response.data.length,
          messageId: messageId,
          commandName: commandName,
          productsBatchNumber,
          functionName: 'fetchProductsRecursively'
        });
        return saveProducts(dbInstance, payload, vendConnectionInfo, response, messageId);
      }
      else if (response && response.data && !response.data.length) {
        logger.debug({
          message: 'No more products to fetch, will exit worker',
          messageId: messageId,
          commandName: commandName,
          productsBatchNumber,
          functionName: 'fetchProductsRecursively'
        });
        return Promise.resolve('noIncrementalProducts');
      }
      else {
        logger.debug({
          message: 'Vend API returning null response',
          response,
          productsBatchNumber,
          messageId: messageId,
          commandName: commandName,
          functionName: 'fetchProductsRecursively'
        });
        return Promise.reject();
      }
    });
}

function saveProducts(dbInstance, payload, vendConnectionInfo, products, messageId) {
  var supplierIds = _.uniq(_.pluck(products.data, 'supplier_id'));
  var productsToDelete = _.filter(fetchedProducts.data, function (eachProduct) {
    return eachProduct.deleted_at !== undefined && eachProduct.deleted_at !== null;
  });
  var vendTags;
  var productsToSave = _.difference(fetchedProducts.data, productsToDelete);
  logger.debug({
    messageId: messageId,
    commandName: commandName,
    message: `Found ${incrementalProducts.length} new products, will filter only required data from them`,
    productsBatchNumber,
    functionName: 'saveProducts'
  });
  logger.debug({
    messageId: messageId,
    commandName: commandName,
    message: `Found ${productsToDelete.length} deleted products, will delete them from the database`,
    productsBatchNumber,
    functionName: 'saveProducts'
  });
  logger.debug({
    messageId: messageId,
    commandName: commandName,
    message: 'Will go on to look for vend tags',
    productsBatchNumber,
    functionName: 'saveProducts'
  });
  var argsForTags = vendSdk.args.tags.fetch();
  return vendSdk.tags.fetchAll(argsForTags, vendConnectionInfo)
    .then(function (tags) {
      logger.debug({
        messageId: messageId,
        commandName: commandName,
        message: `Found ${tags.length} tags, will attach them to their products`,
        productsBatchNumber,
        functionName: 'saveProducts'
      });
      vendTags = tags;
      logger.debug({
        messageId: messageId,
        commandName: commandName,
        message: 'Will look for suppliers to attach to products',
        productsBatchNumber,
        functionName: 'saveProducts'
      });
      return db.collection('SupplierModel').find({
        storeConfigModelId: ObjectId(payload.storeConfigModelId),
        api_id: {
          $in: supplierIds
        }
      }).toArray();
    })
    .then(function (supplierModelInstances) {
      logger.debug({
        messageId: messageId,
        commandName: commandName,
        message: `Found ${supplierModelInstances.length} suppliers, will attach them to products`,
        productsBatchNumber,
        functionName: 'saveProducts'
      });

      /**
       * The code in this block also works. It may be beneficial to find out which one
       * works faster. Also, if someday initializeUnorderedBulkOp() stops working, this
       * may come in handy
       *
       // Create array of operations
       var batch = [];
       Add some operations to be executed
       _.each(incrementalProducts, function (eachProduct) {
        batch.push({
          updateOne: {
            filter: {
              api_id: eachProduct.id
            },
            update: {
              $set: {
                name: eachProduct.name,
                sku: eachProduct.sku,
                supplier: eachProduct.supplier,
                api_id: eachProduct.id,
                storeConfigModelId: ObjectId(payload.storeConfigModelId)
              }
            },
            upsert: true
          }
        });
      });
       Execute the operations
       return db.collection('ProductModel').bulkWrite(batch);
       */

      var batch = db.collection('ProductModel').initializeUnorderedBulkOp();
      _.each(productsToSave, function (eachProduct) {
        var supplierModelToAttach = _.findWhere(supplierModelInstances, {api_id: eachProduct.supplier_id});
        var tagsToAttach = '';
        if (eachProduct.tag_ids && eachProduct.tag_ids.length) {
          _.each(eachProduct.tag_ids, function (eachTagId) {
            tagsToAttach = tagsToAttach + ',' + _.findWhere(vendTags, {id: eachTagId}).name;
          });
          //remove the first ","
          tagsToAttach = tagsToAttach.substr(1, tagsToAttach.length);
        }
        batch.find({
          api_id: eachProduct.id
        }).upsert().updateOne({
          $set: {
            name: eachProduct.name,
            supplierId: supplierModelToAttach ? supplierModelToAttach._id : null,
            supplierVendId: supplierModelToAttach ? supplierModelToAttach.api_id : null,
            supplierCode: eachProduct.supplier_code,
            sku: eachProduct.sku,
            type: eachProduct.type ? eachProduct.type.name : null,
            supply_price: eachProduct.supply_price,
            api_id: eachProduct.id,
            tags: tagsToAttach,
            storeConfigModelId: ObjectId(payload.storeConfigModelId)
          }
        })
      });
      _.each(productsToDelete, function (eachProduct) {
        batch.find({
          api_id: eachProduct.id
        }).remove({
          api_id: eachProduct.id
        })
      });
      logger.debug({
        messageId: messageId,
        commandName: commandName,
        message: 'Attached suppliers and filtered product objects, will download them into database',
        productsBatchNumber,
        functionName: 'saveProducts'
      });
      return executeBatch(batch);
    })
    .catch(function (error) {
      logger.error({
        message: 'Could not execute batch operation, will exit',
        error,
        productsBatchNumber,
        functionName: 'saveProducts'
      });
      return Promise.reject();
    })
    .then(function () {
      logger.debug({
        message: 'Successfully executed batch of Products, will update version number in DB',
        productsBatchNumber,
        functionName: 'saveProducts'
      });
      return db.collection('SyncModel').updateOne({
        $and: [
          {
            'storeConfigModelId': ObjectId(payload.storeConfigModelId)
          },
          {
            'name': 'products'
          }
        ]
      },
      {
        $set: {
          'version': products.version.max
        }
      });
    })
    .catch(function (error) {
      logger.error({
        message: 'Could not update version number in DB, will stop sync',
        error,
        productsBatchNumber,
        functionName: 'saveProducts'
      });
      return Promise.reject('Could not update version number in DB, will stop sync');
    })
    .then(function () {
      payload.versionsAfter = products.version.max;
      return fetchProductsRecursively(dbInstance, vendConnectionInfo, payload, messageId);
    });
}


function executeBatch(batch) {
  return new Promise(function (resolve, reject) {
    logger.debug({ message: `Executing batch of products`, productsBatchNumber, functionName: 'executeBatch' });
    if (batch.s && batch.s.currentBatch && batch.s.currentBatch.operations) {
      batch.execute(function (err, result) {
        if (err) {
          logger.error({ message: `ERROR in batch `, err: err, productsBatchNumber, functionName: 'executeBatch' });
          reject(err);
        }
        else {
          logger.debug({
            message: `Successfully executed batch with ${batch.s.currentBatch.operations.length} operations`,
            productsBatchNumber,
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
      logger.debug({ message: `Skipping empty batch ${productsBatchNumber}`, functionName: 'executeBatch' });
      resolve('Skipped');
    }
  });
}
