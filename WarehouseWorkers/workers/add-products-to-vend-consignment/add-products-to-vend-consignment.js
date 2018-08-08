var SUCCESS = 0;
var FAILURE = 1;

var REPORT_EMPTY = 'report_empty';
var MANAGER_NEW_ORDERS = 'manager_new_orders';
var MANAGER_IN_PROCESS = 'manager_in_process';
var WAREHOUSE_FULFILL = 'warehouse_fulfill';
var MANAGER_RECEIVE = 'manager_receive';
var REPORT_COMPLETE = 'report_complete';

var PAGE_SIZE = 200;
const logger = require('sp-json-logger');

/* When a generic error without a helpful stacktrace occurs, it makes troubleshooting difficult.
 *
 * Without knowing the depth or location at which the error took place,
 * we are forced to litter the code with log statements.
 *
 * This is why, despite decent error propagation, our code has way more catch statements then needed!
 * We are prepared for a situation where we can easily identify the closest code block
 * where the problem in the occured.
 *
 * With that in mind, there are 3 usecases:
 * 1. We want to log the error but still continue by eating or forgiving the error ... due to some "business logic"
 * 2. We want to log the error and propagate it as well ... this makes little to no sense!
 *    Why have the same error logged by multiple catch blocks? How is that helpful?
 *    Its better to log it and then fail-fast, rather than creating redundant rows of logs
 *    that might confuse the person who is troubleshooting a problem
 * 3. We want to log the error and fail-fast.
 */
var runMe = function (payload, config, taskId, messageId) {
  try {
    var fs = require('fs');
    var utils = require('./../../jobs/utils/utils.js');
    var path = require('path');
    var Promise = require('bluebird');
    var _ = require('underscore');

    // Global variable for logging
    var commandName = path.basename(__filename, '.js'); // gives the filename without the .js extension

    // console.log('[MessageId : '+messageId+']'+commandName, 'process.argv:', process.argv);
    // console.log('[MessageId : '+messageId+']'+commandName, 'process.env:', process.env);
    // console.log('[MessageId : '+messageId+']'+commandName, 'payload:', payload);
    // console.log('[MessageId : '+messageId+']'+commandName, 'config:', config);
    // console.log('[MessageId : '+messageId+']'+commandName, 'taskId:', taskId);
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
      return utils.savePayloadConfigToFiles(payload)
        .then(function () {
          try {
            var nconf = require('nconf');
            nconf.file('client', {file: 'config/client.json'})
            //.file('settings', { file: 'config/settings.json' }) // NOTE: useful for quicker testing
              .file('oauth', {file: 'config/oauth.json'});
            logger.debug({ messageId: messageId, commandName: commandName, message: 'nconf.get()', nconf: nconf.get() });

            // HACK starts: dynamically set remote datasource URL
            var datasourcesFile = path.join(__dirname, '/../../client', 'datasources.json');
            logger.debug({ messageId: messageId, datasourcesFile: datasourcesFile, commandName: commandName});

            var beforeDatasourcesContent = require(datasourcesFile);
            //console.log('[MessageId : '+messageId+']'+commandName, 'BEFORE beforeDatasourcesContent: ' + JSON.stringify(beforeDatasourcesContent, null, 2));
            logger.tag('BEFORE beforeDatasourcesContent').debug({
              messageId: messageId,
              commandName: commandName,
              beforeDatasourcesContent: beforeDatasourcesContent
            });

            delete require.cache[require.resolve(datasourcesFile)];

            fs.writeFileSync(datasourcesFile,
              JSON.stringify({
                "db": {
                  "name": "db",
                  "connector": "memory"
                },
                "remoteDS": {
                  "url": payload.loopbackServerUrl + '/api',
                  "name": "remoteDS",
                  "connector": "remote"
                }
              }, null, 2));
            var datasourcesContent = require(datasourcesFile);
            //console.log('[MessageId : '+messageId+']'+commandName, 'AFTER datasourcesContent: ' + JSON.stringify(datasourcesContent, null, 2));
            logger.tag('AFTER datasourcesContent').debug({ datasourcesContent: datasourcesContent });
            // HACK ends

            delete require.cache[require.resolve('./../../client/loopback.js')];
            var client = require('./../../client/loopback.js');
            // the remote datasource
            var remoteDS = client.dataSources.remoteDS;

            // the strong-remoting RemoteObjects instance
            var remotes = remoteDS.connector.remotes;

            var ReportModel = client.models.ReportModel;
            var StockOrderLineitemModel = client.models.StockOrderLineitemModel;

            return Promise.resolve()
              .then(function setupAuthentication() {
                logger.debug({ messageId: messageId, commandName: commandName, message: 'Starting' });
                if (payload.reportId === undefined || payload.reportId === null) {
                  logger.debug({ messageId: messageId, commandName: commandName, message: 'reportId is missing' });
                  return Promise.reject('reportId is missing');
                }
                else {
                  logger.debug({
                    messageId: messageId,
                    commandName: commandName,
                    message: 'report already exists'
                  });

                  // set the access token to be used for all future invocations
                  logger.debug({
                      messageId: messageId,
                      commandName: commandName,
                      loopbackAccessTokenId: payload.loopbackAccessToken.id,
                      loopbackAccessTokenUserId: payload.loopbackAccessToken.userId
                  });
                  remotes.auth = {
                    bearer: (new Buffer(payload.loopbackAccessToken.id)).toString('base64'),
                    sendImmediately: true
                  };
                  //console.log('[MessageId : '+messageId+']'+commandName, 'the access token to be used for all future invocations has been set');
                  logger.debug({
                      messageId: messageId,
                      commandName: commandName,
                      message: 'the access token to be used for all future invocations has been set'
                  });

                  return Promise.resolve(payload.reportId);
                }
              })
              .then(ReportModel.findByIdAsync)
              .then(function (reportModelInstance) {
                var stockOrderLineitemModels = Promise.promisifyAll(
                  reportModelInstance.stockOrderLineitemModels,
                  {
                    filter: function (name, func, target) {
                      return !( name == 'validate');
                    }
                  }
                );
                return stockOrderLineitemModels.countAsync()
                  .then(function (count) {
                    var totalPages = Math.ceil(count / PAGE_SIZE);
                    //console.log('[MessageId : '+messageId+']'+'Will traverse %d rows by fetching %d page(s) of size <= %d', count, totalPages, PAGE_SIZE);
                    logger.debug({
                        messageId: messageId,
                        commandName: commandName,
                        message: `Will traverse ${count} rows by fetching ${totalPages} of size <= ${PAGE_SIZE}`
                    });

                    var pseudoArrayToIterateOverPagesSerially = new Array(totalPages);
                    for (var i = 0; i<totalPages; i++) {
                      pseudoArrayToIterateOverPagesSerially[i] = i + 1;
                    }

                    // this block has been moved up (and a bit out of context) for optimization so it doesn't run inside loops
                    var vendSdk = require('vend-nodejs-sdk')({});
                    var utils = require('./../../jobs/utils/utils.js');
                    var connectionInfo = utils.loadOauthTokens();
                    //console.log('[MessageId : '+messageId+']'+'SUCCESSFULLY LOADED AUTH TOKENS FOR VEND CALLS');
                    logger.debug({
                        messageId: messageId,
                        message: 'SUCCESSFULLY LOADED AUTH TOKENS FOR VEND CALLS'
                    });

                    // constraint Promise.map with concurrency of 1 around pseudoArrayIterateAllPages
                    return Promise.map(
                      pseudoArrayToIterateOverPagesSerially,
                      function (pageNumber) {
                        return ReportModel.getRowsAsync(payload.reportId, PAGE_SIZE, pageNumber)
                          .then(function (stockOrderLineitemModelInstances) {
                            //console.log('[MessageId : '+messageId+']'+'total lineitems retrieved for page #%d: %d',
                            //pageNumber, stockOrderLineitemModelInstances.length);
                            logger.debug({
                                messageId: messageId,
                                message: `total lineitems retrieved for page ${pageNumber}: ${stockOrderLineitemModelInstances.length}`
                            });

                            //console.log('[MessageId : '+messageId+']'+'will create consignment products serially in Vend for page #%d', pageNumber);
                            logger.debug({
                                messageId: messageId,
                                message: `will create consigment products serially in Vend for page ${pageNumber}`
                            });
                            return Promise.map(stockOrderLineitemModelInstances, function (stockOrderLineitemModelInstance) {
                                // TODO: should we also avoid working on products without type (department)?
                                if (stockOrderLineitemModelInstance.productId &&
                                  _.isNumber(stockOrderLineitemModelInstance.supplyPrice) &&
                                  stockOrderLineitemModelInstance.supplyPrice !== null &&
                                  stockOrderLineitemModelInstance.supplyPrice !== undefined) {
                                  var consignmentProduct = {
                                    //'sequence_number': 1,
                                    'consignment_id': reportModelInstance.vendConsignmentId,
                                    'product_id': stockOrderLineitemModelInstance.productId,
                                    'count': stockOrderLineitemModelInstance.orderQuantity,
                                    'cost': stockOrderLineitemModelInstance.supplyPrice
                                  };
                                  //console.log('will create a consignmentProduct: ', consignmentProduct);
                                  return vendSdk.consignments.products.create({body: consignmentProduct}, connectionInfo)
                                    .then(function (newConsignmentProduct) {
                                      //console.log('newConsignmentProduct', newConsignmentProduct);
                                      stockOrderLineitemModelInstance.vendConsignmentProductId = newConsignmentProduct.id;
                                      stockOrderLineitemModelInstance.vendConsignmentProduct = newConsignmentProduct;
                                      return StockOrderLineitemModel.updateAllAsync(
                                        {id: stockOrderLineitemModelInstance.id},
                                        stockOrderLineitemModelInstance
                                      )
                                        .tap(function (updatedReportModelInstance) {
                                          //console.log('updatedStockOrderLineitemModelInstance', updatedStockOrderLineitemModelInstance);
                                          return Promise.resolve();
                                        });
                                    });
                                }
                                else {
                                  //console.log('[MessageId : '+messageId+']'+'skipping lineitems without a Vend productId and/or cost');
                                  logger.debug({
                                      messageId: messageId,
                                      message: 'skipping lineitems without a Vend productId and/or cost'
                                  });
                                  return Promise.resolve();
                                }
                              },
                              {concurrency: 1}
                            );

                          });
                      },
                      {concurrency: 1}
                    )
                      .then(function () {
                        //console.log('[MessageId : '+messageId+']'+'done paging serially through all existing stockOrderLineitemModels');
                        logger.tag('stockOrderLineitemModels').debug({
                            messageId: messageId,
                            message: 'done paging serially through all existing stockOrderLineitemModels'
                        });

                        //console.log('[MessageId : '+messageId+']'+'since equivalent consignment products were created, let\'s move the consignment itself from OPEN to SENT');
                        logger.debug({
                            messageId: messageId,
                            message: 'since equivalent consignment products were created, let\'s move the consignment itself from OPEN to SENT'
                        });
                        var argsForStockOrder = vendSdk.args.consignments.stockOrders.markAsSent();
                        argsForStockOrder.apiId.value = reportModelInstance.vendConsignmentId;
                        argsForStockOrder.body.value = _.omit(reportModelInstance.vendConsignment, 'id');
                        return vendSdk.consignments.stockOrders.markAsSent(argsForStockOrder, connectionInfo)
                          .then(function (updatedStockOrder) {
                            //console.log('markStockOrderAsSent()', 'updatedStockOrder', updatedStockOrder);
                            logger.tag('markStockOrderAsSent()').debug({
                                message: 'updatedStockOrder',
                                updatedStockOrder: updatedStockOrder
                            });
                            return Promise.resolve(updatedStockOrder);
                          });
                      })
                      .then(function (updatedStockOrder) {
                        //console.log('[MessageId : '+messageId+']'+'since stock order is not in SENT state, let\'s move the STATE of our report to the next stage');
                        logger.debug({
                            messageId: messageId,
                            message: 'since stock order is not in SENT state, let\'s move the STATE of our report to the next stage'
                        });
                        reportModelInstance.state = MANAGER_RECEIVE;
                        reportModelInstance.vendConsignment = updatedStockOrder;
                        return ReportModel.updateAllAsync( // TODO: could just use reportModelInstance.save
                          {id: payload.reportId},
                          reportModelInstance
                        )
                          .then(function (updatedReportModelInstance) {
                            //console.log('[MessageId : '+messageId+']'+commandName, 'Updated the ReportModel...', updatedReportModelInstance);
                            logger.debug({
                                messageId: messageId,
                                message: 'Updated the ReportModel',
                                updatedReportModelInstance: updatedReportModelInstance
                            });
                            return Promise.resolve(reportModelInstance);
                          });
                      })
                      .then(function (reportModelInstance) {
                        logger.debug({ messageId: messageId, message: 'Will create a register sales for the consignment' });
                        if (reportModelInstance.createSales) {
                          logger.debug({ messageId: messageId, commandName: commandName, message: 'Will create an at-cost sales in vend' });
                          var initiateSales = require('./../../jobs/initiate-generate-sales-worker');
                          return initiateSales.run(reportModelInstance, payload, messageId);
                        }
                        else {
                          logger.debug({ messageId: messageId, commandName: commandName, message: 'Do not need to create sales for this consignment, process finished...' });
                          return Promise.resolve(reportModelInstance);
                        }
                      });
                  });
              })
              .catch(function (error) {
                // console.error('[MessageId : '+messageId+']'+'2nd last dot-catch block');
                // console.log('[MessageId : '+messageId+']'+commandName, 'ERROR', error);
                logger.error({
                  err: error,
                  messageId: messageId,
                  commandName: commandName,
                  message: '2nd last dot-catch block'
                });
                return Promise.reject(error);
              });
          }
          catch (e) {
            // console.error('[MessageId : '+messageId+']'+'3rd last catch block');
            // console.error('[MessageId : '+messageId+']'+commandName, e);
            logger.error({err: e, messageId: messageId, commandName: commandName, message: '3rd last catch block'});
            throw e; // use `throw` for `catch()` and `reject` for `.catch()`
          }
        })
        .catch(function (error) {
          // console.error('[MessageId : '+messageId+']'+'last dot-catch block');
          // console.log('[MessageId : '+messageId+']'+commandName, 'ERROR', error);
          logger.error({err: error, messageId: messageId, commandName: commandName, message: 'last dot-catch block'});
          return Promise.reject(error);
        });
    }
    catch (e) {
      // console.error('[MessageId : '+messageId+']'+'2nd last catch block');
      // console.error('[MessageId : '+messageId+']'+commandName, e);
      logger.error({err: e, messageId: messageId, commandName: commandName, message: '2nd last catch block'});
      throw e; // use `throw` for `catch()` and `reject` for `.catch()`
    }

  }
  catch (e) {
    // console.error('[MessageId : '+messageId+']'+'last catch block');
    // console.error(e);
    logger.error({err: e, messageId: messageId, message: 'last catch block'});
    throw e; // use `throw` for `catch()` and `reject` for `.catch()`
  }
};

module.exports = {
  run: runMe
};
