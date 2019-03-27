var SUCCESS = 0;
var FAILURE = 1;

var REPORT_EMPTY = 'report_empty';
var MANAGER_NEW_ORDERS = 'manager_new_orders';
var MANAGER_IN_PROCESS = 'manager_in_process';
var WAREHOUSE_FULFILL = 'warehouse_fulfill';
var MANAGER_RECEIVE = 'manager_receive';
var REPORT_COMPLETE = 'report_complete';

var BOXED = 'boxed';

const logger = require('sp-json-logger');


var runMe = function (payload, config, taskId, messageId) {

  try {
    var Promise = require('bluebird');
    var _ = require('underscore');
    var dbUrl = process.env.DB_URL;
    var MongoClient = require('mongodb').MongoClient;
    var ObjectId = require('mongodb').ObjectID;
    var fs = require('fs');
    var utils = require('./../../jobs/utils/utils.js');
    var path = require('path');
    var db = null; //database connected
    var productInstances, inventoryInstances;

    // Global variable for logging
    var commandName = path.basename(__filename, '.js'); // gives the filename without the .js extension

    logger.debug({
      messageId: messageId,
      commandName: commandName,
      payload: payload,
      config: config,
      taskId: taskId,
      argv: process.argv
    });

    process.env['User-Agent'] = taskId + ':' + messageId + ':' + commandName + ':' + payload.domainPrefix;

    logger.debug({ messageId: messageId, commandName: commandName, message: `This worker will generate stock order for outlet ${payload.outletName} and supplier ${payload.supplierName}` });
    return utils.savePayloadConfigToFiles(payload)
      .then(function () {
        return MongoClient.connect(dbUrl, {
          promiseLibrary: Promise
        });
      })
      .then(function (dbInstance) {
        db = dbInstance;
        //TODO: remove these relative paths
        var nconf = require('./../../node_modules/nconf/lib/nconf');
        nconf.file('client', {file: 'config/client.json'})
        //.file('settings', { file: 'config/settings.json' }) // NOTE: useful for quicker testing
          .file('oauth', {file: 'config/oauth.json'});

        //TODO: write authentication code here

        logger.debug({ messageId: messageId, commandName: commandName, nconf: nconf.get() });
        if (payload.reportId === undefined || payload.reportId === null) {
          logger.debug({ messageId: messageId, commandName: commandName, message: `Report does not exist, will create a new one for outlet ${payload.outletName}` });
          return db.collection('ReportModel').insertOne({
            userModelToReportModelId: ObjectId(payload.loopbackAccessToken.userId), // explicitly setup the foreignKeys for related models
            state: REPORT_EMPTY,
            outlet: {
              id: payload.outletId,
              name: payload.outletName // TODO: fetch via an api call instead?
            },
            supplier: {
              id: payload.supplierId,
              name: payload.supplierName // TODO: fetch via an api call instead?
            },
            storeConfigModelId: ObjectId(payload.storeConfigModelId),
            created: new Date()
          });
        }
        else {
          return Promise.resolve('reportExists');
        }
      })
      .then(function (response) {
        logger.debug({ messageId: messageId, commandName: commandName, message: `Will look for products belonging to supplier ID ${payload.supplierId}` });
        return db.collection('ProductModel').find({
          $and: [
            {
              storeConfigModelId: ObjectId(payload.storeConfigModelId)
            },
            {
              supplierVendId: payload.supplierId
            }
          ]
        }).toArray();
      })
      .then(function (supplierProducts) {
        productInstances = supplierProducts;
        var productVendIds = _.pluck(supplierProducts, 'api_id');
        logger.debug({ messageId: messageId, commandName: commandName, message: `Found ${supplierProducts.length} products belonging to supplier ID ${payload.supplierId}` });
        logger.debug({ messageId: messageId, commandName: commandName, message: `Will look for their inventories for outlet id ${payload.outletId}` });
        return db.collection('InventoryModel').find({
          $and: [
            {
              storeConfigModelId: ObjectId(payload.storeConfigModelId)
            },
            {
              product_id: {
                $in: productVendIds
              }
            },
            {
              outlet_id: payload.outletId //TODO: track using payload.storeModelId instead for ids consistency, but this works too
            }
          ]
        }).toArray();
      })
      .then(function (response) {
        inventoryInstances = response;
        logger.debug({ messageId: messageId, commandName: commandName, message: `Found ${inventoryInstances.length} inventories against ${productInstances.length} products` });
        var rows = [];
        _.each(productInstances, function (eachProduct) {
          var useRow = true;

          var caseQuantity = undefined;
          if (eachProduct.tags) {
            var tagsAsCsv = eachProduct.tags.trim();
            //logger.debug({ tagsAsCsv: tagsAsCsv });
            var tagsArray = tagsAsCsv.split(',');
            if (tagsArray && tagsArray.length>0) {
              _.each(tagsArray, function (tag) {
                tag = tag.trim();
                if (tag.length>0) {
                  //logger.debug({ tag: tag });
                  // http://stackoverflow.com/questions/8993773/javascript-indexof-case-insensitive
                  var prefix = 'CaseQuantity:'.toLowerCase();
                  if (tag.toLowerCase().indexOf(prefix) === 0) {
                    var caseQty = tag.substr(prefix.length);
                    //logger.debug({ message: `based on a prefix, adding CaseQuantity: ${caseQty}` });
                    caseQuantity = Number(caseQty);
                  }
                  else {
                    //logger.debug({ message: 'ignoring anything without a prefix' });
                  }
                }
              });
            }
          }
          var inventory = _.findWhere(inventoryInstances, {product_id: eachProduct.api_id});
          if (!inventory) {
            useRow = false;
          }
          else {
            var quantityOnHand = Number(inventory.inventory_level);
            var desiredStockLevel = Number(inventory.reorder_point);
            var orderQuantity = 0;
            if (quantityOnHand<0) {
              logger.debug({ messageId: messageId, commandName: commandName,
                message: `TODO: how should negative inventory be handled? DSL minus QOH w/ a negative QOH will lead to a positive! Example: 100 - (-2) = 102`
              });
            }
            if (!_.isNaN(desiredStockLevel) && _.isNumber(desiredStockLevel)) {
              orderQuantity = desiredStockLevel - quantityOnHand;
              if (orderQuantity>0) {
                useRow = true;
                if (caseQuantity) {
                  if ((orderQuantity % caseQuantity) === 0) {
                    //logger.debug({ message: 'NO-OP: orderQuantity is already a multiple of caseQuantity' });
                  }
                  else {
                    orderQuantity = Math.ceil(orderQuantity / caseQuantity) * caseQuantity;
                  }
                }
              }
              else {
                logger.debug({ messageId: messageId, commandName: commandName, message: `do not waste time on negative or zero orderQuantity ${eachProduct.sku}` });
                useRow = false;
              }
            }
            else {
              //logger.debug({ messageId: messageId, message: 'give humans a chance to look over dubious data', dilutedProduct: dilutedProduct });
              desiredStockLevel = undefined;
              orderQuantity = undefined;
              useRow = true;
            }
          }

          if (useRow) {
            var row = {
              productId: eachProduct.api_id,
              productModelId: eachProduct._id,
              sku: eachProduct.sku,
              name: eachProduct.name,
              quantityOnHand: quantityOnHand,
              desiredStockLevel: desiredStockLevel,
              orderQuantity: orderQuantity,
              caseQuantity: caseQuantity,
              supplyPrice: eachProduct.supply_price,
              supplierCode: eachProduct.supplierCode,
              type: eachProduct.type,
              reportId: ObjectId(payload.reportId),
              userId: payload.loopbackAccessToken.userId
            };
            rows.push(row);
            logger.debug({ messageId: messageId, commandName: commandName, row: row });
          }
          else {
            logger.debug({ messageId: messageId, commandName: commandName, message: `skipping ${eachProduct.sku}` });
            //logger.debug({ messageId: messageId, commandName: commandName, message: 'Skipping', dilutedProduct: dilutedProduct });
          }
        });

        logger.debug({ messageId: messageId, commandName: commandName, message: `Saving total line items ${rows.length}` });
        return db.collection('StockOrderLineitemModel').insertMany(rows);
      })
      .then(function (response) {
        logger.debug({ messageId: messageId, commandName: commandName, message: `Done updating the stock order line item models with required product and inventory info ${response.insertedCount}` });
        logger.debug({ messageId: messageId, commandName: commandName, message: 'Will change the status of report to manager new order' });
        return db.collection('ReportModel').updateOne({_id: ObjectId(payload.reportId)}, {
          $set: {
            state: MANAGER_NEW_ORDERS,
            totalRows: response.insertedCount
          }
        });
      })
      .then(function (response) {
        logger.debug({ messageId: messageId, commandName: commandName, message: 'Updated the report status, will exit worker now', result: response.result });
        return Promise.resolve();
      })
      .catch(function (error) {
        logger.error({ messageId: messageId, commandName: commandName, message: 'last dot-catch block', err: error });
        return Promise.reject(error);
      });
  }
  catch (e) {
    logger.error({ messageId: messageId, message: 'last catch block', err: e });
    throw e; // use `throw` for `catch()` and `reject` for `.catch()`
  }

};

module.exports = {
  run: runMe
};
