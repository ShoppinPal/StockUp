'use strict';

var Promise = require('bluebird');
var request = require('request-promise');
var _ = require('underscore');

var path = require('path');
var fileName = path.basename(__filename, '.js'); // gives the filename without the .js extension
var log = require('./../lib/debug-extension')('common:models:'+fileName);
var excel = require('excel-stream');

var excelRows = [];
var orders = [];

module.exports = function(Container) {

  Container.beforeRemote('upload', function(ctx, unused, next) {
    log.trace('Container > beforeRemote > upload');
    var userId = ctx.req.params.container; // TODO: validate userId basedon accessToken
    log.debug('Container > beforeRemote > upload > userId', userId);
    Container.getContainer(userId, function(err1, container1){
      if (err1) {
        if (err1.code === 'ENOENT') {
          log.debug('Container > beforeRemote > upload > Container does not exist > let us create a new one');
          Container.createContainer({name: userId}, function(err2, container2) {
            if(err2){
              log.debug('Container > beforeRemote > upload > Could not create a new container > unexpected error', err2);
              console.error(err2);
              next(err2);
            }
            else {
              log.debug('Container > beforeRemote > upload > Created a new container', container2.name);
              next();
            }
          });
        }
        else {
          log.debug('Container > beforeRemote > upload > Container does not exist > unexpected error', err1);
          console.error(err1);
          next(err1);
        }
      }
      else {
        log.debug('Container > beforeRemote > upload > Container already exists', container1.name);
        next();
      }
    });
  });

  Container.afterRemote('upload', function(ctx, unused, next) {
    log.debug('Container > afterRemote > upload');
    var files = ctx.result.result.files.file;
    log.debug('Container > afterRemote > upload',
      ' > FILE(S) UPLOADED: %j', files);

    // ASSUMPTION #1 we only get one file at a time
    // ASSUMPTION #2 user only uploads a valid CSV file
    var item = files[0];
    var re = /(?:\.([^.]+))?$/;
    var fileExtension = re.exec(item.name);
    var stream = Container.downloadStream(item.container, item.name);

    if(fileExtension[1] == 'xls' || fileExtension[1] == 'xlsx' || fileExtension[1] == 'XLS' || fileExtension[1] == 'XLSX') {

      stream.pipe(excel())  // same as excel({sheetIndex: 0})
        .on('data', function (excelDataToJSON) {
          processExcelData(excelDataToJSON);
        })
        .on('end', function () {

          var StoreMappingModel = Container.app.models.StoreMappingModel;

          return StoreMappingModel.find({})
            .then(function(storeMappings){
              excelRows.forEach(function (row) {
                var storeName = findMapping(row.CustomerNumber, storeMappings);
                var orderType = row.CustomerPONumber ? 'NewItems' : 'WeeklyOrder';
                if (!(orderExists(row.SalesOrderNumber, orders)) && storeName != false) {
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
                  if (row.SalesOrderNumber == singleOrder.orderNumber) {
                    singleOrder.items.push({
                      sku: row.ItemNumber,
                      name: row.ItemDescription,
                      orderQuantity: row.QtyOrdered,
                      supplyPrice: row.UnitPrice
                    });
                  }
                })
              });

              Promise.map(orders,
                function (singleOrder) {
                  return createReportModelForExcel(singleOrder, Container, next)
                    .then(function (reportModelInstance)
                    {
                      console.log(reportModelInstance);

                      _.each(singleOrder.items, function (excelRowAsObject) {
                        excelRowAsObject.reportId = reportModelInstance.id;
                        excelRowAsObject.userId = reportModelInstance.userModelToReportModelId;
                      });
                      var StockOrderLineitemModel = Container.app.models.StockOrderLineitemModel;
                      StockOrderLineitemModel.create(singleOrder.items, function (err, results)
                      {
                        if (err) {
                          //log.error('error occured', err);
                          //console.error('error occured', err);
                          next(err);
                        }
                        else {
                          log.debug('created StockOrderLineitemModels:', results.length);

                          log.debug('#3 submit a job to the worker infrastructure');
                          var UserModel = Container.app.models.UserModel;
                          return UserModel.findById(reportModelInstance.userModelToReportModelId)
                            .then(function (userModelInstance) {
                              log.trace('userModelInstance', userModelInstance);

                              log.debug('(1) generate a token for the worker to use on the currentUser\'s behalf');
                              return userModelInstance.createAccessTokenAsync(1209600)// can't be empty ... time to live (in seconds) 1209600 is 2 weeks (default of loopback)
                                .then(function (newAccessToken) {
                                  log.debug('(2) fetch the report, store and store-config');
                                  var ReportModel = Container.app.models.ReportModel;
                                  return ReportModel.getAllRelevantModelInstancesForReportModel(reportModelInstance.id)
                                    .spread(function (reportModelInstance, storeModelInstance, storeConfigInstance) {
                                      log.debug('(3) extract domainPrefix from store-config\'s posUrl');
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

                                      return ReportModel.sendPayload(reportModelInstance, options, next)
                                        .then(function (updatedReportModelInstance) {
                                          log.trace('updatedReportModelInstance:', updatedReportModelInstance);
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
                        log.error('Container > afterRemote > upload > end_parsed',
                          '\n', error.name + ':', error.message,
                          '\n', error.stack);
                      }
                      else {
                        log.error('Container > afterRemote > upload > end_parsed',
                          '\n', error);
                      }
                      next(error)
                    });
                },
                {concurrency: 1})
            })


           .then(function () {
              console.log("done!");
              next();
            });
        });
    }
    else if(fileExtension[1] == 'csv' || fileExtension[1] == 'CSV'){

      var Converter = require('csvtojson').Converter;
      var converter = new Converter({constructResult:true}); //new converter instance

      //record_parsed will be emitted each time a row has been parsed.
      converter.on('record_parsed', function(resultRow, rawRow, rowIndex) {
        // map header/column names from the CSV to the field names from StockOrderLineitemModel
        resultRow['supplyPrice'] = resultRow['supplier_cost'];
        resultRow['orderQuantity'] = resultRow['quantity'];
        delete resultRow['supplier_cost'];
        delete resultRow['quantity'];
      });

      //end_parsed will be emitted once parsing finished
      converter.on('end_parsed', function (arrayOfCsvRowsAsObjects) {
        log.debug('parsed csv rows:', arrayOfCsvRowsAsObjects.length);

        log.debug('#1 create a new Reportmodel');
        createReportModelForCsv(item.name, Container, next)
          .then(function(reportModelInstance){
            log.trace('reportModelInstance:', reportModelInstance);

            log.debug('#2 create lineitems from CSV row data and associate them with the new Reportmodel and its user');
            _.each(arrayOfCsvRowsAsObjects, function(csvRowAsObject){
              csvRowAsObject.reportId = reportModelInstance.id;
              csvRowAsObject.userId = reportModelInstance.userModelToReportModelId;
            });
            var StockOrderLineitemModel = Container.app.models.StockOrderLineitemModel;
            StockOrderLineitemModel.create(arrayOfCsvRowsAsObjects, function(err, results){
              if (err) {
                //log.error('error occured', err);
                //console.error('error occured', err);
                next(err);
              }
              else {
                log.debug('created StockOrderLineitemModels:', results.length);

                log.debug('#3 submit a job to the worker infrastructure');
                var UserModel = Container.app.models.UserModel;
                UserModel.findById(reportModelInstance.userModelToReportModelId)
                  .then(function(userModelInstance){
                    log.trace('userModelInstance', userModelInstance);

                    log.debug('(1) generate a token for the worker to use on the currentUser\'s behalf');
                    userModelInstance.createAccessTokenAsync(1209600)// can't be empty ... time to live (in seconds) 1209600 is 2 weeks (default of loopback)
                      .then(function(newAccessToken) {
                        log.debug('(2) fetch the report, store and store-config');
                        var ReportModel = Container.app.models.ReportModel;
                        ReportModel.getAllRelevantModelInstancesForReportModel(reportModelInstance.id)
                          .spread(function (reportModelInstance, storeModelInstance, storeConfigInstance) {
                            log.debug('(3) extract domainPrefix from store-config\'s posUrl');
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

                            ReportModel.sendPayload(reportModelInstance, options, next)
                              .then(function(updatedReportModelInstance){
                                log.trace('updatedReportModelInstance:', updatedReportModelInstance);
                                next();
                              });
                          });
                      });
                  });
              }
            });
          })
          .catch(function(error){
            if (error instanceof Error) {
              log.error('Container > afterRemote > upload > end_parsed',
                '\n', error.name + ':', error.message,
                '\n', error.stack);
            }
            else {
              log.error('Container > afterRemote > upload > end_parsed',
                '\n', error);
            }
            next(error);
          });
      });

      stream.pipe(converter);
      stream.on('error', next);
    }
  });

  var createReportModelForCsv = function(filename, Container, next){
    try {
      // before: 41st_Gift_Shop-CSC-114340-WeeklyOrder.CSV
      filename = filename.slice(0,-4);
      var data = filename.split('-');
      // after: [ 41st_Gift_Shop, CSC, 114340, WeeklyOrder.CSV ]

      if (!data || data.length < 2 || !data[0] || !data[1]) {
        log.error('Container > createReportModel', 'Invalid filename: ' + filename);
        next(new Error('Invalid filename: ' + filename));
      }
      else {
        var storeName = data[0];
        storeName = storeName.replace(/_/g, '.'); // . is treated as regex when
        log.debug('regex with storeName', storeName);

        var supplierName = data[1];
        supplierName = supplierName.replace(/_/g, '.'); // . is treated as regex when
        log.debug('regex with supplierName', supplierName);
        supplierName = '^' + supplierName + '$';
        log.debug('modified regex with supplierName', supplierName);

        // TODO: current user should only be able to search his/her own stores and suppliers, not all of them!

        var StoreModel = Container.app.models.StoreModel;
        return StoreModel.findOne({where: {name: {like: storeName}}})
          .then(function (storeModelInstance) {
            log.trace('storeModelInstance', storeModelInstance);
            if (storeModelInstance) {
              var SupplierModel = Container.app.models.SupplierModel;
              return SupplierModel.findOne({
                  where: {
                    name: {
                      like: supplierName
                    },
                    storeConfigModelToSupplierModelId: storeModelInstance.storeConfigModelToStoreModelId
                  }
                })
                .then(function (supplierModelInstance) {
                  log.trace('supplierModelInstance', supplierModelInstance);
                  if (supplierModelInstance) {
                    //return Promise.resolve([storeModelInstance,supplierModelInstance]);
                    var ReportModel = Container.app.models.ReportModel;
                    return ReportModel.create({
                      name: filename,
                      userModelToReportModelId: storeModelInstance.userModelToStoreModelId, // explicitly setup the foreignKeys for related models
                      state: ReportModel.ReportModelStates.REPORT_EMPTY,
                      outlet: {
                        id: storeModelInstance.api_id, // jshint ignore:line
                        name: storeModelInstance.name,
                      },
                      supplier: {
                        id: supplierModelInstance.apiId,
                        name: supplierModelInstance.name
                      }
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
    }
    catch (error) {
      log.error('Container > createReportModel', '\n', error);
      next(error);
    }
  };


  var createReportModelForExcel = function(singleOrder, Container, next){
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
        log.debug('regex with storeName', singleOrder.storeName);

        //var supplierName = data[1];
        singleOrder.supplierName = singleOrder.supplierName.replace(/_/g, '.'); // . is treated as regex when
        log.debug('regex with supplierName', singleOrder.supplierName);

        // TODO: current user should only be able to search his/her own stores and suppliers, not all of them!

        var StoreModel = Container.app.models.StoreModel;
        return StoreModel.findOne({where: {name: {like: singleOrder.storeName}}})
          .then(function (storeModelInstance) {
            log.trace('storeModelInstance', storeModelInstance);
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
                  log.trace('supplierModelInstance', supplierModelInstance);
                  if (supplierModelInstance) {
                    //return Promise.resolve([storeModelInstance,supplierModelInstance]);
                    var ReportModel = Container.app.models.ReportModel;
                    return ReportModel.create({
                      name: singleOrder.storeName+"_"+singleOrder.supplierName+"_"+singleOrder.orderNumber+"_"+singleOrder.orderType,
                      userModelToReportModelId: storeModelInstance.userModelToStoreModelId, // explicitly setup the foreignKeys for related models
                      state: ReportModel.ReportModelStates.REPORT_EMPTY,
                      outlet: {
                        id: storeModelInstance.api_id, // jshint ignore:line
                        name: storeModelInstance.name,
                      },
                      supplier: {
                        id: supplierModelInstance.apiId,
                        name: supplierModelInstance.name
                      }
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
      log.error('Container > createReportModel', '\n', error);
      next(error);
    }
  };

  var processExcelData = function (excelRow) {
    excelRows.push(excelRow);
  };

  var findMapping = function (customerNumber, array) {
    var i = null;
    for (i = 0; array.length > i; i += 1) {
      if (array[i].code === customerNumber) {
        return array[i].storeName;
      }
    }
    return false;
  };


  var orderExists = function (orderNumber, array) {
    var i = null;
    for (i = 0; array.length > i; i += 1) {
      if (array[i].orderNumber === orderNumber) {
        return true;
      }
    }
    return false;
  };

};
