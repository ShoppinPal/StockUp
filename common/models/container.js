'use strict';

var Promise = require('bluebird');
var request = require('request-promise');
var _ = require('underscore');
var moment = require('moment');

var path = require('path');
var fileName = path.basename(__filename, '.js'); // gives the filename without the .js extension
const logger = require('sp-json-logger');
var excel = require('excel-stream');

var excelRows = [];
var orders = [];

module.exports = function (Container) {

  Container.beforeRemote('upload', function (ctx, unused, next) {
    //log.trace('Container > beforeRemote > upload');
    logger.trace({log: {message: 'Container > beforeRemote > upload'}});
    var userId = ctx.req.params.container; // TODO: validate userId basedon accessToken
    //log.debug('Container > beforeRemote > upload > userId', userId);
    logger.debug({log: {message: 'Container > beforeRemote > upload > userId', userId: userId}});
    Container.getContainer(userId, function (err1, container1) {
      if (err1) {
        if (err1.code === 'ENOENT') {
          logger.debug({log: { message: 'Container > beforeRemote > upload > Container does not exist > let us create a new one'}});
          Container.createContainer({name: userId}, function (err2, container2) {
            if (err2) {
              logger.debug({log: { message: 'Container > beforeRemote > upload > Could not create a new container > unexpected error', error: err2 }});
              console.error(err2);
              next(err2);
            }
            else {
              logger.debug({log: { message: `Container > beforeRemote > upload > Created a new container ${container2.name}` }});
              next();
            }
          });
        }
        else {
          logger.debug({log: { message: 'Container > beforeRemote > upload > Container does not exist > unexpected error', error: err1 }});
          console.error(err1);
          next(err1);
        }
      }
      else {
        logger.debug({log: {message: `Container > beforeRemote > upload > Container already exists ${container1.name}` }});
        next();
      }
    });
  });

  Container.afterRemote('upload', function (ctx, unused, next) {
    //log.debug('Container > afterRemote > upload');
    logger.debug({log: {message: 'Container > afterRemote > upload'}});
    var files = ctx.result.result.files.file;
    // log.debug('Container > afterRemote > upload',
    //   ' > FILE(S) UPLOADED: %j', files);
    logger.debug({log: {message: 'Container > afterRemote > upload > FILE(S) UPLOADED', files: files}}); // Does this match above commented log?

    var createSales = unused.result.fields.createSales[0];
    var storeOutletId = unused.result.fields.storeOutletId[0];
    var warehouseOutletId = unused.result.fields.warehouseOutletId[0];
    var supplierId = unused.result.fields.supplierId[0];

    // ASSUMPTION #1 we only get one file at a time
    // ASSUMPTION #2 user only uploads a valid CSV file
    var item = files[0];
    var re = /(?:\.([^.]+))?$/;
    var fileExtension = re.exec(item.name);
    var stream = Container.downloadStream(item.container, item.name);


    if (fileExtension[1].toLowerCase() === 'xls' || fileExtension[1].toLowerCase() === 'xlsx') {

      stream.pipe(excel())  // same as excel({sheetIndex: 0})
        .on('data', function (excelDataToJSON) {
          //put excel rows in array excelRows
          processExcelData(excelDataToJSON);
        })
        .on('end', function () {

          var StoreMappingModel = Container.app.models.StoreMappingModel;

          return StoreMappingModel.find({})
            .then(function (storeMappings) {

              var filename = item.name;
              if (filename.lastIndexOf("FFCC", 0) === 0) {

                //kamal:create empty orders for each store
                orders = [];
                storeMappings.forEach(function (singleMapping) {
                  if (!(orderStoreNameExists(singleMapping.shortName, orders))) {
                    orders.push({
                      storeName: singleMapping.shortName,
                      items: []
                    });
                  }
                });


                //fill items in orders with quantity from the excel sheet
                orders.forEach(function (singleOrder) {
                  excelRows.forEach(function (row) {
                    if (row[singleOrder.storeName]>0) {
                      singleOrder.items.push({
                        sku: row["sku"],
                        fulfilledQuantity: row[singleOrder.storeName],
                        orderQuantity: row[singleOrder.storeName]
                      })
                    }
                  });
                });

                //remove the stores that have zero items in order
                for (var i = orders.length - 1; i>=0; i--) {
                  //console.log(orders[i].storeName +" : "+ orders[i].items.length);
                  logger.debug({log: {message: `orders[i].storeName: ${orders[i].items.length}`}});
                  if (orders[i].items.length == 0) {
                    var index = orders.indexOf(orders[i]);
                    if (index> -1) {
                      orders.splice(index, 1);
                    }
                  }
                }

                Promise.map(orders,
                  function (singleOrder) {
                    //create empty reports for all stores and store them in ReportModel
                    return createReportModelForExcelWithoutSupplier(singleOrder, Container, next)
                      .then(function (reportModelInstance) {
                        logger.debug({reportModelInstance: reportModelInstance});

                        _.each(singleOrder.items, function (excelRowAsObject) {
                          excelRowAsObject.reportId = reportModelInstance.id;
                          excelRowAsObject.userId = reportModelInstance.userModelToReportModelId;
                        });
                        var StockOrderLineitemModel = Container.app.models.StockOrderLineitemModel;

                        //create StockOrderLineitemModel for all items in the report
                        StockOrderLineitemModel.create(singleOrder.items, function (err, results) {
                          if (err) {
                            //log.error('error occured', err);
                            //console.error('error occured', err);
                            next(err);
                          }
                          else {
                            //log.debug('created StockOrderLineitemModels:', results.length);
                            logger.debug({log: {message: `created StockOrderLineitemModels: ${results.length}`}});

                            //log.debug('#3 submit a job to the worker infrastructure');
                            logger.debug({log: {message: '#3 submit a job to the worker infrastructure'}});
                            var UserModel = Container.app.models.UserModel;
                            return UserModel.findById(reportModelInstance.userModelToReportModelId)
                              .then(function (userModelInstance) {
                                //log.trace('userModelInstance', userModelInstance);
                                logger.tag('userModelInstance').debug({log: {userModelInstance: userModelInstance}});

                                //log.debug('(1) generate a token for the worker to use on the currentUser\'s behalf');
                                logger.debug({log: {message: '(1) generate a token for the worker to use on the currentUser\'s behalf'}});
                                return userModelInstance.createAccessTokenAsync(1209600)// can't be empty ... time to live (in seconds) 1209600 is 2 weeks (default of loopback)
                                  .then(function (newAccessToken) {
                                    //log.debug('(2) fetch the report, store and store-config');
                                    logger.debug({log: {message: '(2) fetch the report, store and store-config'}});
                                    var ReportModel = Container.app.models.ReportModel;
                                    return ReportModel.getAllRelevantModelInstancesForReportModel(reportModelInstance.id)
                                      .spread(function (reportModelInstance, storeModelInstance, storeConfigInstance) {
                                        //log.debug('(3) extract domainPrefix from store-config\'s posUrl');
                                        logger.debug({log: {message: '(3) extract domainPrefix from store-config\'s posUrl'}});
                                        var posUrl = storeConfigInstance.posUrl;
                                        //Assuming this regexp checks whether the posUrl contains vendhq.com as domain name or not
                                        var regexp = /^https?:\/\/(.*)\.vendhq\.com$/i;
                                        var matches = posUrl.match(regexp);
                                        var domainPrefix = matches[1];

                                        var options = ReportModel.preparePayload(
                                          storeModelInstance,
                                          domainPrefix,
                                          newAccessToken,
                                          reportModelInstance,
                                          Container.app.get('importStockOrderToWarehouseWithoutSupplier')
                                        );
                                        var queueUrl = storeConfigInstance.usesWorkersV2.importOrders ? Container.app.get('awsQueueUrl2') : Container.app.get('awsQueueUrl2');

                                        //send payload to worker
                                        return ReportModel.sendPayload(reportModelInstance, options, queueUrl, next)
                                          .then(function (updatedReportModelInstance) {
                                            //log.trace('updatedReportModelInstance:', updatedReportModelInstance);
                                            logger.tag('updatedReportModelInstance').debug({log: {updatedReportModelInstance: updatedReportModelInstance}});
                                            //next();
                                          });
                                      });
                                  });
                              });
                          }
                        });
                      })
                      .catch(function (error) {
                        if (error instanceof Error) {
                          // log.error('Container > afterRemote > upload > end_parsed',
                          //   '\n', error.name + ':', error.message,
                          //   '\n', error.stack);
                          logger.error({err: error, message: 'Container > afterRemote > upload > end_parsed'});
                        }
                        else {
                          // log.error('Container > afterRemote > upload > end_parsed',
                          //   '\n', error);
                          logger.error({err: error, message: 'Container > afterRemote > upload > end_parsed'});
                        }
                        next(error)
                      });
                  },
                  {concurrency: 1})
              }
              else {

                orders = [];
                excelRows.forEach(function (row) {
                  var storeName = findMapping(row.CustomerNumber, storeMappings);
                  var orderType = row.CustomerPONumber ? row.CustomerPONumber : 'WeeklyOrder';
                  if (storeName && (!(orderNumberExists(row.SalesOrderNumber, orders)))) {
                    orders.push({
                      storeName: storeName,
                      supplierName: 'CSC',
                      orderType: orderType,
                      orderNumber: row.SalesOrderNumber,
                      items: []
                    });
                  }
                });

                orders.forEach(function (singleOrder) {
                  excelRows.forEach(function (row) {
                    if (row.QtyShipped>0 && row.SalesOrderNumber == singleOrder.orderNumber) {
                      if (!(startsWith(row.ItemNumber.toString(), "S-"))) {
                        singleOrder.items.push({
                          sku: row.ItemNumber,
                          orderQuantity: row.QtyOrdered,
                          fulfilledQuantity: row.QtyShipped,
                          supplyPrice: row.UnitPrice
                        });
                      }
                    }
                  })
                });

                Promise.map(orders,
                  function (singleOrder) {
                    return createReportModelForExcel(singleOrder, Container, next)
                      .then(function (reportModelInstance) {
                        console.log(reportModelInstance);

                        _.each(singleOrder.items, function (excelRowAsObject) {
                          excelRowAsObject.reportId = reportModelInstance.id;
                          excelRowAsObject.userId = reportModelInstance.userModelToReportModelId;
                        });
                        var StockOrderLineitemModel = Container.app.models.StockOrderLineitemModel;
                        StockOrderLineitemModel.create(singleOrder.items, function (err, results) {
                          if (err) {
                            //log.error('error occured', err);
                            //console.error('error occured', err);
                            next(err);
                          }
                          else {
                            //log.debug('created StockOrderLineitemModels:', results.length);
                            logger.tag('StockOrderLineitemModels').debug({log: {message: `created StockOrderLineitemModels: ${results.length}`}});

                            //log.debug('#3 submit a job to the worker infrastructure');
                            logger.debug({log: {message: '#3 submit a job to the worker infrastructure'}});
                            var UserModel = Container.app.models.UserModel;
                            return UserModel.findById(reportModelInstance.userModelToReportModelId)
                              .then(function (userModelInstance) {
                                logger.trace({log: {message: 'userModelInstance', userModelInstance: userModelInstance }});

                                logger.debug({log: {message: '(1) generate a token for the worker to use on the currentUser\'s behalf' }});
                                return userModelInstance.createAccessTokenAsync(1209600)// can't be empty ... time to live (in seconds) 1209600 is 2 weeks (default of loopback)
                                  .then(function (newAccessToken) {
                                    logger.debug({log: {message: '(2) fetch the report, store and store-config' }});
                                    var ReportModel = Container.app.models.ReportModel;
                                    return ReportModel.getAllRelevantModelInstancesForReportModel(reportModelInstance.id)
                                      .spread(function (reportModelInstance, storeModelInstance, storeConfigInstance) {
                                        logger.debug({log: {message: '(3) extract domainPrefix from store-config\'s posUrl' }});
                                        var posUrl = storeConfigInstance.posUrl;
                                        var regexp = /^https?:\/\/(.*)\.vendhq\.com$/i;
                                        var matches = posUrl.match(regexp);
                                        var domainPrefix = matches[1];

                                        var options = ReportModel.preparePayload(
                                          storeModelInstance,
                                          domainPrefix,
                                          newAccessToken,
                                          reportModelInstance,
                                          Container.app.get('importStockOrderToWarehouse')
                                        );

                                        var queueUrl = storeConfigInstance.usesWorkersV2.importOrders ? ReportModel.app.get('awsQueueUrl2') : ReportModel.app.get('awsQueueUrl');

                                        return ReportModel.sendPayload(reportModelInstance, options, queueUrl, next)
                                          .then(function (updatedReportModelInstance) {
                                            logger.trace({log: {message: 'updatedReportModelInstance:', updatedReportModelInstance: updatedReportModelInstance }});
                                            //next();
                                          });
                                      });
                                  });
                              });
                          }
                        });
                      })
                      .catch(function (error) {
                        if (error instanceof Error) {
                          // log.error('Container > afterRemote > upload > end_parsed',
                          //   '\n', error.name + ':', error.message,
                          //   '\n', error.stack);
                          logger.error({err: error, message: 'Container > afterRemote > upload > end_parsed'});
                        }
                        else {
                          // log.error('Container > afterRemote > upload > end_parsed',
                          //   '\n', error);
                          logger.error({err: error, message: 'Container > afterRemote > upload > end_parsed'});
                        }
                        next(error)
                      });
                  },
                  {concurrency: 1})
              }
            })

            //this gets processed before the previous then block is completed
            //TODO: promisify it properly
            .then(function () {
              excelRows = [];
              console.log("done!");
              next();
            });
        });
    }
    else if (fileExtension[1].toLowerCase() === 'csv') {

      logger.debug({log: { message: 'Converting csv to json' }});
      var Converter = require('csvtojson').Converter;
      var converter = new Converter({constructResult: true}); //new converter instance

      //record_parsed will be emitted each time a row has been parsed.
      converter.on('record_parsed', function (resultRow, rawRow, rowIndex) {
        // map header/column names from the CSV to the field names from StockOrderLineitemModel
        resultRow['supplyPrice'] = resultRow['supplier_cost'];
        resultRow['orderQuantity'] = resultRow['quantity'];
        //TODO: handle blank rows
        resultRow['orderQuantity'] = resultRow['Quantity'];
        resultRow['sku'] = resultRow['SKU'];
        delete resultRow['SKU'];
        delete resultRow['Quantity'];
        delete resultRow['supplier_cost'];
        delete resultRow['quantity'];
      });

      converter.on('error', function (error) {
        logger.error({err: error, message:'Could not parse csv information' });
        next('Could not parse csv information');
      });

      //end_parsed will be emitted once parsing finished
      converter.on('end_parsed', function (arrayOfCsvRowsAsObjects) {
        //log.debug('parsed csv rows:', arrayOfCsvRowsAsObjects.length);
        logger.debug({log: {message: `parsed csv rows: ${arrayOfCsvRowsAsObjects.length}`}});
        //log.debug('#1 create a new Reportmodel');
        logger.debug({log: {message: '#1 create a new Reportmodel'}});
        createReportModelForCsv(item.name, Container, supplierId, storeOutletId, warehouseOutletId, createSales)
          .then(function (reportModelInstance) {
            //log.trace('reportModelInstance:', reportModelInstance);
            logger.tag('reportModelInstance').debug({log: {reportModelInstance: reportModelInstance}});

            //log.debug('#2 create lineitems from CSV row data and associate them with the new Reportmodel and its user');
            logger.debug({log: {message: '#2 create lineitems from CSV row data and associate them with the new Reportmodel and its user'}});
            _.each(arrayOfCsvRowsAsObjects, function (csvRowAsObject) {
              csvRowAsObject.reportId = reportModelInstance.id;
              csvRowAsObject.userId = reportModelInstance.userModelToReportModelId;
            });
            var StockOrderLineitemModel = Container.app.models.StockOrderLineitemModel;
            StockOrderLineitemModel.create(arrayOfCsvRowsAsObjects, function (err, results) {
              if (err) {
                //log.error('error occured', err);
                //console.error('error occured', err);
                next(err);
              }
              else {
                //log.debug('created StockOrderLineitemModels:', results.length);
                logger.tag('StockOrderLineitemModels').debug({log: {message: `created StockOrderLineitemModels: ${results.length}`}});

                //log.debug('#3 submit a job to the worker infrastructure');
                logger.debug({log: {message: '#3 submit a job to the worker infrastructure'}});
                var UserModel = Container.app.models.UserModel;
                //TODO: it sends the wrong userId when report is generated from file import
                UserModel.findById(reportModelInstance.userModelToReportModelId)
                  .then(function (userModelInstance) {
                    logger.trace({log: {message: 'userModelInstance', userModelInstance: userModelInstance }});

                    logger.debug({log: { message: '(1) generate a token for the worker to use on the currentUser\'s behalf' }});
                    userModelInstance.createAccessTokenAsync(1209600)// can't be empty ... time to live (in seconds) 1209600 is 2 weeks (default of loopback)
                      .then(function (newAccessToken) {
                        logger.debug({log: {message: '(2) fetch the report, store and store-config' }});
                        var ReportModel = Container.app.models.ReportModel;
                        ReportModel.getAllRelevantModelInstancesForReportModel(reportModelInstance.id)
                          .spread(function (reportModelInstance, storeModelInstance, storeConfigInstance) {
                            logger.debug({log: {message: '(3) extract domainPrefix from store-config\'s posUrl' }});
                            var posUrl = storeConfigInstance.posUrl;
                            var regexp = /^https?:\/\/(.*)\.vendhq\.com$/i;
                            var matches = posUrl.match(regexp);
                            var domainPrefix = matches[1];
                            var worker;
                            if (reportModelInstance.supplier.name === 'ANY') {
                              worker = Container.app.get('importStockOrderToWarehouseWithoutSupplier');
                            }
                            else {
                              worker = Container.app.get('importStockOrderToWarehouse');
                            }

                            var options = ReportModel.preparePayload(
                              storeModelInstance,
                              domainPrefix,
                              newAccessToken,
                              reportModelInstance,
                              worker
                            );

                            var queueUrl = storeConfigInstance.usesWorkersV2.importOrders ? ReportModel.app.get('awsQueueUrl2') : ReportModel.app.get('awsQueueUrl');

                            ReportModel.sendPayload(reportModelInstance, options, queueUrl, next)
                              .then(function (updatedReportModelInstance) {
                                logger.trace({log: {message: 'updatedReportModelInstance:', updatedReportModelInstance: updatedReportModelInstance }});
                                next();
                              });
                          });
                      });
                  });
              }
            });
          })
          .catch(function (error) {
            if (error instanceof Error) {
              // log.error('Container > afterRemote > upload > end_parsed',
              //   '\n', error.name + ':', error.message,
              //   '\n', error.stack);
              logger.error({err: error, message: 'Container > afterRemote > upload > end_parsed'});
            }
            else {
              // log.error('Container > afterRemote > upload > end_parsed',
              //   '\n', error);
              logger.error({err: error, message: 'Container > afterRemote > upload > end_parsed'});
            }
            next(error);
          });
      });

      stream.pipe(converter);
      stream.on('error', next);
    }
  });

  var createReportModelForCsv = function (filename, Container, supplierId, storeOutletId, warehouseOutletId, createSales) {
    // TODO: add validation for warehouse?
    // TODO: current user should only be able to search his/her own stores and suppliers, not all of them!
    var storeOutlet, warehouseOutlet;
    var StoreModel = Container.app.models.StoreModel;
    return StoreModel.findById(storeOutletId)
      .then(function (storeModelInstance) {
        if (!storeModelInstance) {
          return Promise.reject('Could not find a matching store for: ' + filename);
        }
        else {
          storeOutlet = storeModelInstance;
          return StoreModel.findById(warehouseOutletId);
        }
      })
      .then(function (warehouseInstance) {
        warehouseOutlet = warehouseInstance;
        var SupplierModel = Container.app.models.SupplierModel;
        return SupplierModel.find({
          where: {
            id: supplierId,
            storeConfigModelToSupplierModelId: storeOutlet.storeConfigModelToStoreModelId
          }
        });
      })
      .then(function (supplierModelInstance) {
        logger.trace({log: {message: 'supplierModelInstance', supplierModelInstance: supplierModelInstance }});
        if (!supplierModelInstance.length) {
          logger.debug({log: {message: 'Could not find a supplier, will create report without supplier' }});
          //create a report without supplier
          supplierModelInstance[0] = {
            apiId: null,
            name: 'ANY'
          };
        }
        var ReportModel = Container.app.models.ReportModel;
        return ReportModel.create({
          name: filename,
          userModelToReportModelId: storeOutlet.userModelToStoreModelId, // explicitly setup the foreignKeys for related models
          state: ReportModel.ReportModelStates.REPORT_EMPTY,
          outlet: {
            id: storeOutlet.api_id, // jshint ignore:line
            name: storeOutlet.name
          },
          supplier: {
            id: supplierModelInstance[0].apiId,
            name: supplierModelInstance[0].name
          },
          createSales: createSales,
          warehouseOutlet: {
            id: warehouseOutlet.api_id,
            name: warehouseOutlet.name
          },
          paymentTypeId: warehouseOutlet.defaultPaymentType && warehouseOutlet.defaultPaymentType.api_id ? warehouseOutlet.defaultPaymentType.api_id : null,
          vendCustomerId: storeOutlet.vendCustomerId,
          storeConfigModelId: storeOutlet.storeConfigModelToStoreModelId
        });
      })
      .catch(function (error) {
        logger.error({ err: error, message: 'Error creating report' });
        return Promise.reject('Error creating report', error);
      });
  };


  var createReportModelForExcel = function (singleOrder, Container, next) {
    try {
      // before: 41st_Gift_Shop-CSC-114340-WeeklyOrder.CSV
      /*filename = filename.slice(0,-4);
       var data = filename.split('-');
       // after: [ 41st_Gift_Shop, CSC, 114340, WeeklyOrder.CSV ]

       if (!data || data.length < 2 || !data[0] || !data[1]) {
       log.error('Container > createReportModel', 'Invalid filename: ' + filename);
       next(new Error('Invalid filename: ' + filename));
       }
       else {
       */
      //var storeName = data[0];
      singleOrder.storeName = singleOrder.storeName.replace(/_/g, '.'); // . is treated as regex when
      //log.debug('regex with storeName', singleOrder.storeName);
      logger.debug({log: {message: `regex with storeName: ${singleOrder.storeName}`}});

      //var supplierName = data[1];
      singleOrder.supplierName = singleOrder.supplierName.replace(/_/g, '.'); // . is treated as regex when
      //log.debug('regex with supplierName', singleOrder.supplierName);
      logger.debug({log: {message: `regex with supplierName: ${singleOrder.supplierName}`}});

      var storeConfigModelId;
      // TODO: current user should only be able to search his/her own stores and suppliers, not all of them!

      var StoreModel = Container.app.models.StoreModel;
      return StoreModel.findOne({where: {name: {like: singleOrder.storeName}}})
        .then(function (storeModelInstance) {
          storeConfigModelId = storeModelInstance.storeConfigModelToStoreModelId;
          //log.trace('storeModelInstance', storeModelInstance);
          logger.tag('storeModelInstance').debug({log: {storeModelInstance: storeModelInstance}});
          if (storeModelInstance) {
            var SupplierModel = Container.app.models.SupplierModel;
            return SupplierModel.findOne({
              where: {
                name: {
                  like: singleOrder.supplierName
                },
                storeConfigModelToSupplierModelId: storeModelInstance.storeConfigModelToStoreModelId
              }
            })
              .then(function (supplierModelInstance) {
                //log.trace('supplierModelInstance', supplierModelInstance);
                logger.tag('supplierModelInstance').debug({log: {supplierModelInstance: supplierModelInstance}});
                if (supplierModelInstance) {
                  //return Promise.resolve([storeModelInstance,supplierModelInstance]);
                  var ReportModel = Container.app.models.ReportModel;
                  return ReportModel.create({
                    name: singleOrder.storeName + "_" + singleOrder.supplierName + "_" + singleOrder.orderNumber + "_" + singleOrder.orderType,
                    userModelToReportModelId: storeModelInstance.userModelToStoreModelId, // explicitly setup the foreignKeys for related models
                    state: ReportModel.ReportModelStates.REPORT_EMPTY,
                    outlet: {
                      id: storeModelInstance.api_id, // jshint ignore:line
                      name: storeModelInstance.name,
                    },
                    supplier: {
                      id: supplierModelInstance.apiId,
                      name: supplierModelInstance.name
                    },
                    storeConfigModelId: storeConfigModelId
                  });
                }
                else {
                  return Promise.reject('Could not find a matching supplier for: ' + filename);
                }
              });
          }
          else {
            return Promise.reject('Could not find a matching store for: ' + filename);
          }
        });

    }
    catch (error) {
      //log.error('Container > createReportModel', '\n', error);
      logger.error({err: error, message: 'Container > createReportModel'});
      next(error);
    }
  };

  var createReportModelForExcelWithoutSupplier = function (singleOrder, Container, next) {
    try {
      // before: 41st_Gift_Shop-CSC-114340-WeeklyOrder.CSV
      /*filename = filename.slice(0,-4);
       var data = filename.split('-');
       // after: [ 41st_Gift_Shop, CSC, 114340, WeeklyOrder.CSV ]

       if (!data || data.length < 2 || !data[0] || !data[1]) {
       log.error('Container > createReportModel', 'Invalid filename: ' + filename);
       next(new Error('Invalid filename: ' + filename));
       }
       else {
       */
      //var storeName = data[0];


      //this code basically creates shortnames for storenames
      //TODO: why to create them when they can retrieved from db StoreMappingModel
      //it finds these stores by similar names in StoreModel
      //TODO: simply replace underscores with spaces
      singleOrder.storeName = singleOrder.storeName.replace(/_/g, '.'); // . is treated as regex when
      //log.debug('regex with storeName', singleOrder.storeName);
      logger.debug({log: {message: `regex with storeName: ${singleOrder.storeName}`}});

      var StoreModel = Container.app.models.StoreModel;
      return StoreModel.findOne({where: {name: {like: singleOrder.storeName}}})
        .then(function (storeModelInstance) {
          //log.trace('storeModelInstance', storeModelInstance);
          logger.tag('storeModelInstance').debug({log: {storeModelInstance: storeModelInstance}});
          if (storeModelInstance) {



            //create a report model instance for the store
            var ReportModel = Container.app.models.ReportModel;
            return ReportModel.create({
              name: singleOrder.storeName + "_" + moment().format("YYYY-MM-DD"),
              userModelToReportModelId: storeModelInstance.userModelToStoreModelId, // explicitly setup the foreignKeys for related models
              state: ReportModel.ReportModelStates.REPORT_EMPTY,
              outlet: {
                id: storeModelInstance.api_id, // jshint ignore:line
                name: storeModelInstance.name
              },
              supplier: {
                name: "ANY" //TODO: why to use static value, when I chose CSC in the UI, and the file I uploaded was for FFCC
              },
              storeConfigModelId: storeModelInstance.storeConfigModelToStoreModelId
            });
          }
          else {
            return Promise.reject('Could not find a matching store for: ' + filename);
          }
        });
    }
    catch (error) {
      //log.error('Container > createReportModel', '\n', error);
      logger.error({err: error, message: 'Container > createReportModel'});
      next(error);
    }
  };


  var processExcelData = function (excelRow) {
    excelRows.push(excelRow);
  };

  var findMapping = function (customerNumber, array) {
    var i = null;
    for (i = 0; array.length>i; i += 1) {
      if (array[i].code === customerNumber) {
        return array[i].storeName;
      }
    }
    return false;
  };


  var orderNumberExists = function (orderNumber, array) {
    var i = null;
    for (i = 0; array.length>i; i += 1) {
      if (array[i].orderNumber === orderNumber) {
        return true;
      }
    }
    return false;
  };

  var startsWith = function (str, substr) {
    return str.lastIndexOf(substr, 0) === 0;
  };

  var orderStoreNameExists = function (orderStoreName, array) {
    var i = null;
    for (i = 0; array.length>i; i += 1) {
      if (array[i].storeName === orderStoreName) {
        return true;
      }
    }
    return false;
  };
};
