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
            logger.tag('nconf').debug({ messageId: messageId, commandName: commandName, nconf: nconf.get() });

            // HACK starts: dynamically set remote datasource URL
            var datasourcesFile = path.join(__dirname, '/../../client', 'datasources.json');
            logger.debug({ messageId: messageId, commandName: commandName, datasourcesFile: datasourcesFile });

            var beforeDatasourcesContent = require(datasourcesFile);
            logger.tag('BEFORE beforeDatasourcesContent').debug({
                messageId: messageId,
                commandName: commandName,
                message: 'BEFORE beforeDatasourcesContent',
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
            logger.debug({
                messageId: messageId,
                commandName: commandName,
                message: 'AFTER datasourcesContent',
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
                //console.log('[MessageId : '+messageId+']'+commandName, 'starting');
                logger.tag('Report').debug({
                    messageId: messageId,
                    commandName: commandName,
                    message: 'starting'
                });
                if (payload.reportId === undefined || payload.reportId === null) {
                  //console.log('[MessageId : '+messageId+']'+commandName, 'need to create a new report');
                  logger.debug({
                      messageId: messageId,
                      commandName: commandName,
                      message: 'need to create a new report'
                  });

                  return client.models.UserModel.loginAsync(payload.credentials) // get an access token
                    .then(function (token) {
                      //console.log('[MessageId : '+messageId+']'+'Logged in as', payload.credentials.email);
                      logger.debug({
                          messageId: messageId,
                          message: `Logged in as ${payload.credentials.email}`,
                          user: payload.credentials.email
                      });

                      payload.loopbackAccessToken = token;

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
                      //console.log('[MessageId : '+messageId+']'+commandName, 'the access token to be used for all future invocations has been set');
                      logger.debug({
                          messageId: messageId,
                          commandName: commandName,
                          message: 'the access token to be used for all future invocations has been set'
                      });

                      return Promise.resolve();
                    })
                    .then(function () {
                      return client.models.ReportModel.createAsync({
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
                      logger.tag('new reportModelInstance').debug({
                          messageId: messageId,
                          message: 'new reportModelInstance',
                          reportModelInstance: reportModelInstance
                      });
                      payload.reportId = reportModelInstance.id; // save the new report id into the payload
                      return Promise.resolve();
                    });
                }
                else { // (2) otherwise work with the report mentioned in payload.reportId
                  //console.log('[MessageId : '+messageId+']'+commandName, 'report already exists');
                  logger.tag('Report').debug({
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
                  //console.log('[MessageId : '+messageId+']'+commandName, 'the access token to be used for all future invocations has been set');
                  logger.debug({
                      messageId: messageId,
                      commandName: commandName,
                      message: 'the access token to be used for all future invocations has been set'
                  });

                  return Promise.resolve();
                }
              })
              .then(function decideOp() {
                // NOTE: no time to investigate why we end up accidently nuking our foreign-keys
                //       later on somwhere in code ... when we use this shortcut to avoid one extra server call
                //var reportModelInstance = new client.models.ReportModel({id: payload.reportId});

                return client.models.ReportModel.findByIdAsync(payload.reportId)
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
                        logger.debug({ messageId: messageId, message: 'inside decideOp()', count: count });
                        if (count == 0) {
                          logger.debug({
                              messageId: messageId,
                              message: 'Will run the OP for: processPagedOrderGenSerially'
                          });
                          return Promise.resolve('processPagedOrderGenSerially');
                        }
                        else {
                          return Promise.reject(commandName + ' > the stock order already has products in it');
                        }
                      });
                  });
              })
              .tap(function processPagedOrderGenSerially(methodName) {
                var depth1 = commandName + ' > processPagedOrderGenSerially';
                if (methodName !== 'processPagedOrderGenSerially') {
                  logger.debug({ messageId: messageId, message: 'will skip processPagedOrderGenSerially' });
                  return Promise.resolve();
                }
                else {
                  var totalRows = 0;
                  var paginationInfo = require('./../../jobs/fetch-product-pagination-info.js');
                  return paginationInfo.run(config.pageSizeForVendFetches)
                    .then(function (paginationInfo) {
                      //console.log('[MessageId : '+messageId+']'+depth1, '> paginationInfo', paginationInfo);
                      logger.tag('PaginationInfo').debug({
                          messageId: messageId,
                          depth: depth1,
                          paginationInfo: paginationInfo
                      });
                      var pageNumbers = [];
                      if (paginationInfo) {
                        //console.log('[MessageId : '+messageId+']'+depth1, '> # of pages to process: ' + paginationInfo.pages);
                        logger.debug({
                            messageId: messageId,
                            depth: depth1,
                            message: `# of pages to process: ${paginationInfo.pages}`
                        });
                        for (var i = 1; i<=paginationInfo.pages; i++) {
                          pageNumbers.push(i);
                        }
                      }
                      else {
                        //console.log('[MessageId : '+messageId+']'+depth1, '> There is only one page to process');
                        logger.debug({
                            messageId: messageId,
                            depth: depth1,
                            message: 'There is only one page to process'
                        });
                        pageNumbers.push(1);
                      }
                      return Promise.map(
                        pageNumbers,
                        function (pageNumber) {
                          // console.log('[MessageId : '+messageId+']'+depth1,
                          //   '> Will process data for page #', pageNumber,
                          //   'with pageSize: ' + config.pageSizeForVendFetches);
                          logger.tag('PaginationInfo').debug({
                              messageId: messageId,
                              depth: depth1,
                              message: `Will process data for page #${pageNumber} with pageSize: ${config.pageSizeForVendFetches}`
                          });
                          // TODO: the following require'D variable seems to get cached and create trouble?
                          var processPagedJob = require('./../../jobs/generate-stock-order-paged.js');
                          return processPagedJob.run(
                            payload.reportId,
                            payload.outletId,
                            payload.supplierId,
                            payload.loopbackAccessToken.userId,
                            pageNumber,
                            config.pageSizeForVendFetches,
                            messageId
                          )
                            .then(function processPagedJob(rows) {
                              var depth2 = depth1 + ' > processPagedJob';
                              //console.log('[MessageId : '+messageId+']'+depth2, '> # of line items to be saved: ' + rows.length);
                              logger.debug({
                                  messageId: messageId,
                                  depth: depth2,
                                  message: `lineitems to be saved: ${rows.length}`
                              });
                              if (!rows || rows.length<1) {
                                return Promise.resolve();
                              }
                              else {
                                totalRows += rows.length;
                                return client.models.StockOrderLineitemModel.createAsync(rows)
                                  .then(function (stockOrderLineitemModelInstances) {
                                    // TODO: file a bug w/ strongloop support, the data that comes back
                                    // does not represent the newly created rows in size accurately
                                    // console.log('[MessageId : '+messageId+']'+depth2, '> Created a chunk of lineitems with length:',
                                    //   _.keys(stockOrderLineitemModelInstances).length);
                                    logger.debug({
                                        messageId: messageId,
                                        depth: depth2,
                                        message: `Created a chunk of lineitems with length: ${_.keys(stockOrderLineitemModelInstances).length}`
                                    });
                                    return Promise.resolve();
                                  });
                              }
                            });
                        },
                        {concurrency: 1}
                      )
                        .then(function markStockOrderAsReady() {
                          var depth2 = depth1 + ' > markStockOrderAsReady';
                          logger.debug({
                              messageId: messageId,
                              depth: depth2,
                              message: 'finished processing all pages of data serially, will mark stock order as ready',
                              totalRows: totalRows
                          });
                          return client.models.ReportModel.findByIdAsync(payload.reportId)
                            .then(function foundById(reportModelInstance) {
                              var depth3 = depth2 + ' > foundById';
                              logger.debug({
                                  messageId: messageId,
                                  depth: depth3,
                                  message: 'Found the ReportModel...',
                                  reportModelInstance: reportModelInstance
                              });

                              reportModelInstance.state = MANAGER_NEW_ORDERS;
                              reportModelInstance.totalRows = totalRows;

                              return client.models.ReportModel.updateAllAsync(
                                {id: payload.reportId},
                                reportModelInstance
                              )
                                .then(function (info) {
                                  logger.debug({
                                      messageId: messageId,
                                      depth: depth3,
                                      message: 'Updated the ReportModel...',
                                      info: info
                                  });
                                  return Promise.resolve();
                                });
                            });
                        });
                    })
                    .then(function () {
                      return utils.notifyClient(payload, config, {
                        taskId: taskId,
                        message: 'Your ' + payload.supplierName + ' order for ' + payload.outletName + ' has been generated.'
                      });
                    })
                    .catch(function (error) {
                      // console.error('[MessageId : '+messageId+']'+depth1, '> dot-catch block');
                      // console.log('[MessageId : '+messageId+']'+depth1, '> ERROR', error);
                      logger.error({err: error, messageId: messageId, depth: depth1, message: 'dot-catch block'});
                      return Promise.reject(error);
                    });
                }
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
      logger.error({err: e, messageId: messageId, message: '2nd last catch block'});
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
