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
              .file('oauth', {file: 'config/oauth.json'});

            //console.log('[MessageId : '+messageId+']'+commandName, 'nconf:', nconf.get());
            logger.debug({messageId: messageId, commandName: commandName, nconf: nconf.get()});

            // HACK starts: dynamically set remote datasource URL
            var datasourcesFile = path.join(__dirname, '/../../client', 'datasources.json');
            logger.debug({ messageId: messageId, datasourcesFile: datasourcesFile, commandName: commandName });

            var beforeDatasourcesContent = require(datasourcesFile);
            logger.tag('BEFORE beforeDatasourcesContent').debug({
              messageId: messageId,
              beforeDatasourcesContent: beforeDatasourcesContent,
              commandName: commandName
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
            logger.tag('AFTER datasourcesContent').debug({
              messageId: messageId,
              commandName: commandName,
              datasourcesContent: datasourcesContent
            });
            // HACK ends

            delete require.cache[require.resolve('./../../client/loopback.js')];
            var client = require('./../../client/loopback.js');
            // the remote datasource
            var remoteDS = client.dataSources.remoteDS;

            /*console.log('before', remoteDS);
             console.log('before', remoteDS.url);
             remoteDS.url = payload.loopbackServerUrl;
             console.log('after', remoteDS.url);*/

            // the strong-remoting RemoteObjects instance
            var remotes = remoteDS.connector.remotes;

            var UserModel = client.models.UserModel;
            var ReportModel = client.models.ReportModel;
            var StockOrderLineitemModel = client.models.StockOrderLineitemModel;

            // TODO: (2) figure out the total # of pages we will be dealing with
            //           ex: 42 pages total
            // TODO: (3) run the report for totalPages/5 pages
            //           ex: page 1-5
            // TODO: (4) queue the next job to work on the res of the pages
            //           ex: start at page 6/42, work on pages 6-10
            // TODO: (5) last job to run should change the state from empty to new_orders
            //           ex: whomever process pages 40-42

            return Promise.resolve()
              .then(function () { // (1) create a report if payload.reportId is empty
                logger.debug({ messageId: messageId, commandName: commandName, message: 'Starting' });
                if (payload.reportId === undefined || payload.reportId === null) {
                  //console.log(commandName, 'need to create a new report');
                  logger.debug({ commandName: commandName, message: 'need to create a new report' });

                  return UserModel.loginAsync(payload.credentials) // get an access token
                    .then(function (token) {
                      //console.log('[MessageId : '+messageId+']'+'Logged in as', payload.credentials.email);
                      logger.tag('Logged In As').debug({ messageId: messageId, user: payload.credentials.email });

                      payload.loopbackAccessToken = token;

                      // set the access token to be used for all future invocations
                      // console.log('[MessageId : '+messageId+']'+commandName, 'payload.loopbackAccessToken.id', payload.loopbackAccessToken.id);
                      // console.log('[MessageId : '+messageId+']'+commandName, 'payload.loopbackAccessToken.userId', payload.loopbackAccessToken.userId);
                      logger.debug({
                        messageId: messageId,
                        loopbackAccessTokenId: payload.loopbackAccessToken.id,
                        loopbackAccessTokenUserId: payload.loopbackAccessToken.userId,
                        commandName: commandName
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
                      return Promise.resolve();
                    })
                    .then(function () {
                      return ReportModel.createAsync({
                        userModelToReportModelId: payload.loopbackAccessToken.userId, // explicitly setup the foreignKeys for related models
                        state: REPORT_EMPTY,
                        outlet: {
                          id: payload.outletId,
                          name: payload.outletName // TODO: fetch via an api call instead?
                        },
                        supplier: {
                          id: payload.supplierId,
                          name: payload.supplierName // TODO: fetch via an api call instead?
                        }
                      });
                    })
                    .then(function (reportModelInstance) {
                      //console.log('[MessageId : '+messageId+']'+'new reportModelInstance:', reportModelInstance);
                      logger.debug({
                        messageId: messageId,
                        reportModelInstance: reportModelInstance,
                        message: 'new reportModelInstance'
                      });
                      payload.reportId = reportModelInstance.id; // save the new report id into the payload
                      return Promise.resolve();
                    });
                }
                else { // (2) otherwise work with the report mentioned in payload.reportId
                  logger.debug({
                    messageId: messageId,
                    commandName: commandName,
                    message: 'report already exists'
                  });

                  // set the access token to be used for all future invocations
                  // console.log('[MessageId : '+messageId+']'+commandName, 'payload.loopbackAccessToken.id', payload.loopbackAccessToken.id);
                  // console.log('[MessageId : '+messageId+']'+commandName, 'payload.loopbackAccessToken.userId', payload.loopbackAccessToken.userId);
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
                  logger.debug({
                    messageId: messageId,
                    commandName: commandName,
                    message: 'the access token to be used for all future invocations has been set'
                  });
                  return Promise.resolve();
                }
              })
              .tap(function removeUnreceivedProducts() {
                // NOTE: no time to investigate why we end up accidently nuking our foreign-keys
                //       later on somwhere in code ... when we use this shortcut to avoid one extra server call
                //var reportModelInstance = new client.models.ReportModel({id: payload.reportId});
                return ReportModel.findByIdAsync(payload.reportId)
                  .then(function (reportModelInstance) {
                    //console.log('[MessageId : '+messageId+']'+commandName, 'Found the ReportModel...', reportModelInstance);
                    logger.debug({
                      messageId: messageId,
                      commandName: commandName,
                      message: 'Found the ReportModel...',
                      reportModelInstance: reportModelInstance
                    });
                    var stockOrderLineitemModels = Promise.promisifyAll(
                      reportModelInstance.stockOrderLineitemModels,
                      {
                        filter: function (name, func, target) {
                          return !( name == 'validate');
                        }
                      }
                    );
                    var where = { // only work with rows that need to be deleted
                      //reportId: payload.reportId, // don't need this, lineitem object is a relational instance already
                      or: [
                        {receivedQuantity: null},
                        {receivedQuantity: {exists: false}},
                        {receivedQuantity: {lte: 0}}
                      ],
                      vendConsignmentProductId: {ne: null}
                    };
                    return stockOrderLineitemModels.countAsync(where)
                      .then(function (count) {
                        var pageSize = 200;
                        var totalPages = Math.ceil(count / pageSize);
                        //console.log('[MessageId : '+messageId+']'+'Will traverse %d rows by fetching %d page(s) of size <= %d', count, totalPages, pageSize);
                        logger.debug({
                          messageId: messageId,
                          message: `Will traverse ${count} rows by fetching ${totalPages} page(s) of size <= ${pageSize}`
                        });

                        var pseudoArrayToIterateOverPagesSerially = new Array(totalPages);
                        for (var i = 0; i<totalPages; i++) {
                          pseudoArrayToIterateOverPagesSerially[i] = i + 1;
                        }

                        // constraint Promise.map with concurrency of 1 around pseudoArrayIterateAllPages
                        return Promise.map(
                          pseudoArrayToIterateOverPagesSerially,
                          function (pageNumber) {
                            return ReportModel.getRowsAsync(payload.reportId, pageSize, pageNumber, where)
                              .then(function (lineitems) {
                                logger.debug({
                                  messageId: messageId,
                                  message: `total lineitems retrieved for page ${pageNumber}: ${lineitems.length}`
                                });

                                return Promise.map(
                                  lineitems,
                                  function (lineitem) {
                                    // console.log('[MessageId : '+messageId+']'+'DELETE lineitem from Vend w/ productId:', lineitem.productId, '\n',
                                    //   'name:', lineitem.name, '\n',
                                    //   'state:', lineitem.state, '\n',
                                    //   'ordered:', lineitem.orderQuantity,
                                    //   ', fulfilled:', lineitem.fulfilledQuantity,
                                    //   ', received:', lineitem.receivedQuantity);
                                    logger.debug({
                                      messageId: messageId,
                                      message: `DELETE lineitem from Vend w/ productId: ${lineitem.productId}`,
                                      lineitem: lineitem
                                    });
                                    var deleteStockOrderRow = require('./../../jobs/delete-stock-order-row.js');
                                    return deleteStockOrderRow.run(lineitem.vendConsignmentProductId)
                                      .catch(function (error) {
                                        // console.error('[MessageId : '+messageId+']'+'removeUnreceivedProducts dot-catch block', 'will ignore the error to keep going');
                                        // console.log('[MessageId : '+messageId+']'+commandName, 'ERROR', error);
                                        logger.error({
                                          err: error,
                                          messageId: messageId,
                                          commandName: commandName,
                                          message: 'removeUnreceivedProducts dot-catch block. will ignore the error to keep going'
                                        });
                                        return Promise.resolve(); // ignore the error to keep going
                                      });
                                  },
                                  {concurrency: 1}
                                )
                                  .then(function () {
                                    logger.debug({ message: `done deleting ALL lineitems for page ${pageNumber}` });
                                    return Promise.resolve();
                                  });
                              });
                          },
                          {concurrency: 1}
                        )
                          .then(function afterPagingSerially() {
                            logger.debug({
                              message: messageId,
                              commandName: commandName,
                              message: 'all pages done. done with removeUnreceivedProducts op. will update the status of stock order in Vend to RECEIVED'
                            });

                            //console.log('[MessageId : '+messageId+']'+commandName, ' > will update the status of stock order in Vend to RECEIVED');
                            var markStockOrderAsReceived = require('./../../jobs/mark-stock-order-received.js');
                            return markStockOrderAsReceived.run(
                              reportModelInstance.vendConsignmentId,
                              _.omit(reportModelInstance.vendConsignment, 'id', messageId)
                            )
                              .then(function updateReportModel(updatedStockOrder) {
                                //console.log('[MessageId : '+messageId+']'+commandName, ' > updated stock order in Vend to RECEIVED', updatedStockOrder);
                                logger.debug({
                                  messageId: messageId,
                                  message: 'updated stock order in Vend to RECEIVED',
                                  updatedStockOrder: updatedStockOrder
                                });
                                reportModelInstance.vendConsignment = updatedStockOrder;
                                return ReportModel.updateAllAsync(
                                  {id: payload.reportId},
                                  reportModelInstance
                                )
                                  .then(function (info) {
                                    // console.log('[MessageId : '+messageId+']'+commandName, 'Updated the ReportModel...');
                                    // console.log('[MessageId : '+messageId+']'+commandName, info);
                                    logger.debug({
                                      messageId: messageId,
                                      commandName: commandName,
                                      message: 'Updated the ReportModel...',
                                      info: info
                                    });
                                    return Promise.resolve();
                                  });
                              });
                          });
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
    // console.error('[MessageId : '+messageId+']'+e);
    logger.error({err: e, messageId: messageId, message: 'last catch block'});
    throw e; // use `throw` for `catch()` and `reject` for `.catch()`
  }
};

module.exports = {
  run: runMe
};
