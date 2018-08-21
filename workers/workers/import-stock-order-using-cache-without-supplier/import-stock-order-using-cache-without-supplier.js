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
    var vendSdk = require('vend-nodejs-sdk')({});

    // Global variable for logging
    var commandName = path.basename(__filename, '.js'); // gives the filename without the .js extension

    logger.debug({
        messageId: messageId,
        commandName: commandName,
        payload: payload,
        config: config,
        taskId: taskId
    });

    var cachePostfix = taskId + '_' + messageId; // used for creating unique cache-key downstream

    try {
      var Memcached = require('memcached');
      var cache = Promise.promisifyAll(new Memcached(process.env.cacheUrl));

      process.env['User-Agent'] = taskId + ':' + messageId + ':' + commandName + ':' + payload.domainPrefix;
      return utils.savePayloadConfigToFiles(payload)
        .then(function () {
          try {
            var nconf = require('nconf');
            nconf.file('client', {file: 'config/client.json'})
              .file('oauth', {file: 'config/oauth.json'});

            //console.log('[MessageId : '+messageId+']'+commandName, 'nconf:', nconf.get());
            logger.tag('nconf').debug({
                messageId: messageId,
                commandName: commandName,
                nconf: nconf.get()
            });

            // HACK starts: dynamically set remote datasource URL
            var datasourcesFile = path.join(__dirname, '/../../client', 'datasources.json');
            //console.log('[MessageId : '+messageId+']'+commandName, 'datasourcesFile: ' + datasourcesFile);
            logger.debug({ messageId: messageId, commandName: commandName, datasourcesFile: datasourcesFile });

            var beforeDatasourcesContent = require(datasourcesFile);
            //console.log('[MessageId : '+messageId+']'+commandName, 'BEFORE beforeDatasourcesContent: ' + JSON.stringify(beforeDatasourcesContent, null, 2));
            logger.tag('BEFORE beforeDatasourcesContent').debug({
                messageId: messageId,
                datasourcesContent: datasourcesContent,
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
                    message: 'Starting'
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
                      logger.tag('Logged In As').debug({
                          messageId: messageId,
                          user: payload.credentials.email,
                          message: `Logged In As ${payload.credentials.email}`
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
                      logger.tag('Access Token').debug({
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
                        }
                      });
                    })
                    .then(function (reportModelInstance) {
                      //console.log('[MessageId : '+messageId+']'+'new reportModelInstance:', reportModelInstance);
                      logger.debug({
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
                  logger.tag('Access Token Set').debug({
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
                        //console.log('[MessageId : '+messageId+']'+'inside decideOp(), count:', count);
                        logger.debug({
                            messageId: messageId,
                            commandName: commandName,
                            message: 'inside decideOp()',
                            count: count
                        });
                        if (count>0) { // if rows already exist, it means the raw data was imported already
                          //console.log('[MessageId : '+messageId+']'+'Will run the OP for: importStockOrderCachedWithoutSupplier');
                          logger.debug({
                              messageId: messageId,
                              message: 'Will run the OP for: importStockOrderCachedWithoutSupplier'
                          });
                          return Promise.resolve('importStockOrderCachedWithoutSupplier');
                        }
                        else {
                          return Promise.reject(commandName + ' > raw data has not been imported yet');
                        }
                      });
                  });
              })
              .tap(function importStockOrderCached(methodName) {
                if (methodName !== 'importStockOrderCachedWithoutSupplier') {
                  //console.log('[MessageId : '+messageId+']'+'will skip importStockOrderCachedWithoutSupplier');
                  logger.debug({
                      messageId: messageId,
                      message: 'will skip importStockOrderCachedWithoutSupplier'
                  });
                  return Promise.resolve();
                }
                else {
                  var prepStockOrder = require('./../../jobs/cache-vend-products-for-stock-order-without-supplier.js');
                  return prepStockOrder.run(
                    payload.reportId,
                    payload.outletId,
                    payload.loopbackAccessToken.userId,
                    cache,
                    cachePostfix,
                    messageId
                  )
                    .then(function (/*dilutedProducts*/) {
                      // NOTE: no time to investigate why we end up accidently nuking our foreign-keys
                      //       later on somwhere in code ... when we use this shortcut to avoid one extra server call
                      //var reportModelInstance = new client.models.ReportModel({id: params.reportId});
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
                              var itemsFailedFromIronCache = [];
                              // constraint Promise.map with concurrency of 1 around pseudoArrayIterateAllPages
                              return Promise.map(
                                pseudoArrayToIterateOverPagesSerially,
                                function (pageNumber) {
                                  return client.models.ReportModel.getRowsAsync(payload.reportId, pageSize, pageNumber)
                                    .then(function (lineitems) {
                                      //console.log('[MessageId : '+messageId+']'+'total lineitems retrieved for page #%d: %d', pageNumber, lineitems.length);
                                      logger.debug({
                                          messageId: messageId,
                                          message: `total lineitems retrieved for page #${pageNumber}: lineitems.length`
                                      });

                                      // cross-reference and fill out lineitems against data from Vend
                                      return Promise.map(
                                        lineitems,
                                        function (lineitem) {
                                          var key = lineitem.sku + ':' + taskId + '_' + messageId;
                                          //console.log('[MessageId : '+messageId+']'+'lookup vend data for:', key);
                                          logger.debug({
                                              messageId: messageId,
                                              message: 'lookup vend data for key',
                                              key: key
                                          });
                                          return cache.getAsync(key)
                                            .then(function (response) {
                                              var dilutedProduct = JSON.parse(response);
                                              if (dilutedProduct) {
                                                lineitem.productId = dilutedProduct.id;
                                                lineitem.name = dilutedProduct.name;
                                                if (dilutedProduct.inventory) {
                                                  lineitem.quantityOnHand = Number(dilutedProduct.inventory.count);
                                                  lineitem.desiredStockLevel = Number(dilutedProduct.inventory['reorder_point']);
                                                }
                                                if (!(lineitem.supplyPrice)) {
                                                  lineitem.supplyPrice = dilutedProduct.supply_price;
                                                }
                                                if (!(lineitem.fulfilledQuantity)) {
                                                  lineitem.fulfilledQuantity = lineitem.orderQuantity;
                                                }
                                                lineitem.type = dilutedProduct.type;
                                                if (lineitem.type) { // warehouse folks can choose to box those lacking department/product-type, manually
                                                  lineitem.state = BOXED; // boxed by default
                                                  lineitem.boxNumber = 1; // boxed together by default
                                                }
                                              }
                                              else {
                                                //console.log('[MessageId : '+messageId+']'+'WARN: did not find cached vend data for lineitem', lineitem);
                                                logger.debug({
                                                    messageId: messageId,
                                                    message: 'did not find cached vend data for lineitem',
                                                    lineitem: lineitem
                                                });
                                                // TODO: should we queue up these lineitem rows for deletion from the report?
                                                //       or is it better to leave them for reporting purposes?
                                              }
                                              return Promise.resolve();
                                            })
                                            .catch(function (error) {
                                              logger.error({ messageId: messageId, message: 'failed to lookup vend data from cache, maybe it expired or maybe it was never placed there', err: error });
                                              itemsFailedFromIronCache.push(lineitem.sku);

                                              logger.debug({ messageId: messageId, message: 'ignoring this ERROR, so that we may finish the rest of the process' });
                                              logger.debug({
                                                  messageId: messageId,
                                                  commandName: commandName,
                                                  message: 'Pushed failed for lineitem',
                                                  lineitem: lineitem
                                              });
                                              return Promise.resolve();
                                            });
                                        },
                                        {concurrency: 1}
                                      )
                                        .then(function () {
                                          var connectionInfo = utils.loadOauthTokens();

                                          var failedFromCache = function (sku, failedItems) {
                                            var i = null;
                                            for (i = 0; failedItems.length>i; i += 1) {
                                              if (failedItems[i] === sku) {
                                                return true;
                                              }
                                            }
                                            return false;
                                          };

                                          return Promise.map(lineitems,
                                            function (lineitem) {
                                              if (failedFromCache(lineitem.sku, itemsFailedFromIronCache)) {

                                                return vendSdk.products.fetchBySku({sku: {value: lineitem.sku}}, connectionInfo)
                                                  .then(function (response) {
                                                    var product = response.products[0];
                                                    var neoProduct = _.pick(product, 'name', 'supply_price', 'id', 'sku', 'type');
                                                    neoProduct.inventory = _.find(product.inventory, function (inv) {
                                                      return inv.outlet_id === payload.outletId;
                                                    });
                                                    lineitem.productId = neoProduct.id;
                                                    lineitem.name = neoProduct.name;
                                                    if (neoProduct.inventory) {
                                                      lineitem.quantityOnHand = Number(neoProduct.inventory.count);
                                                      lineitem.desiredStockLevel = Number(neoProduct.inventory['reorder_point']);
                                                    }
                                                    lineitem.fulfilledQuantity = lineitem.orderQuantity;
                                                    lineitem.type = neoProduct.type;
                                                    if (!(lineitem.supplyPrice)) {
                                                      lineitem.supplyPrice = neoProduct.supply_price;
                                                    }
                                                    if (lineitem.type) { // warehouse folks can choose to box those lacking department/product-type, manually
                                                      lineitem.state = BOXED; // boxed by default
                                                      lineitem.boxNumber = 1; // boxed together by default
                                                    }
                                                    return Promise.resolve();
                                                  })
                                                  .catch(function (error) {
                                                    // console.log('[MessageId : '+messageId+']'+commandName,"Vend SKU lookup failed for sku : ",lineitem.sku);
                                                    // console.log('[MessageId : '+messageId+']'+commandName, 'ERROR', error.stack);
                                                    logger.error({
                                                      err: error,
                                                      messageId: messageId,
                                                      commandName: commandName,
                                                      message: `Vend SKU lookup failed for sku: ${lineitem.sku}`
                                                    });
                                                    return Promise.resolve();
                                                  });
                                              }
                                            },
                                            {concurrency: 1}
                                          )
                                            .then(function () {
                                              // console.log('[MessageId : '+messageId+']'+'cross-referenced and filled out lineitems against data from IronCache');
                                              // console.log('[MessageId : '+messageId+']'+'will send update(s) to loopback');
                                              logger.debug({
                                                  messageId: messageId,
                                                  message: 'cross-referenced and filled out lineitems against data from IronCache. will send update(s) to loopback'
                                              });
                                              return client.models.ReportModel.updateRowsAsync(payload.reportId, lineitems);
                                            });
                                        })
                                    });
                                },
                                {concurrency: 1}
                              )
                                .then(function () {
                                  //console.log('[MessageId : '+messageId+']'+'done paging serially through all existing stockOrderLineitemModels');
                                  logger.info({
                                      messageId: messageId,
                                      message: 'done paging serially through all existing stockOrderLineitemModels'
                                  });

                                  //console.log('[MessageId : '+messageId+']'+'since the lineitems were updated properly, let\'s move the STATE of our report to the next stage');
                                  logger.info({
                                      messageId: messageId,
                                      message: 'since the lineitems were updated properly, let\'s move the STATE of our report to the next stage'
                                  });
                                  reportModelInstance.state = WAREHOUSE_FULFILL;
                                  reportModelInstance.totalRows = count; // TODO: should we change it to be only what was corss-reference-able?
                                  return client.models.ReportModel.updateAllAsync(
                                    {id: payload.reportId},
                                    reportModelInstance
                                  )
                                    .then(function (info) {
                                      //console.log('[MessageId : '+messageId+']'+commandName, 'Updated the ReportModel...');
                                      logger.tag('ReportModel').info({
                                          messageId: messageId,
                                          commandName: commandName,
                                          message: 'Updated the ReportModel...'
                                      });
                                      return Promise.resolve();
                                    });
                                });
                            });
                        });
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
