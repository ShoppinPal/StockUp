'use strict';

var Promise = require('bluebird');
var request = require('request-promise');
var _ = require('underscore');

var path = require('path');
var fileName = path.basename(__filename, '.js'); // gives the filename without the .js extension
var log = require('debug')('common:models:'+fileName);

module.exports = function(Container) {

  Container.beforeRemote('upload', function(ctx, unused, next) {
    log('Container > beforeRemote > upload');
    var userId = ctx.req.params.container; // TODO: validate userId basedon accessToken
    log('Container > beforeRemote > upload > userId', userId);
    Container.getContainer(userId, function(err1, container1){
      if (err1) {
        if (err1.code === 'ENOENT') {
          log('Container > beforeRemote > upload > Container does not exist > let us create a new one');
          Container.createContainer({name: userId}, function(err2, container2) {
            if(err2){
              log('Container > beforeRemote > upload > Could not create a new container > unexpected error', err2);
              console.error(err2);
              next(err2);
            }
            else {
              log('Container > beforeRemote > upload > Created a new container', container2.name);
              next();
            }
          });
        }
        else {
          log('Container > beforeRemote > upload > Container does not exist > unexpected error', err1);
          console.error(err1);
          next(err1);
        }
      }
      else {
        log('Container > beforeRemote > upload > Container already exists', container1.name);
        next();
      }
    });
  });

  Container.afterRemote('upload', function(ctx, unused, next) {
    log('Container > afterRemote > upload');
    var files = ctx.result.result.files.file;
    log('Container > afterRemote > upload',
        ' > FILE(S) UPLOADED: %j', files);

    // ASSUMPTION #1 we only get one file at a time
    // ASSUMPTION #2 user only uploads a valid CSV file
    var item = files[0];
    var stream = Container.downloadStream(item.container, item.name);

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
      log('parsed csv rows:', arrayOfCsvRowsAsObjects.length);

      log('#1 create a new Reportmodel');
      createReportModel(item.name, Container, next)
        .then(function(reportModelInstance){
          log('reportModelInstance:', reportModelInstance);

          log('#2 create lineitems from CSV row data and associate them with the new Reportmodel and its user');
          _.each(arrayOfCsvRowsAsObjects, function(csvRowAsObject){
            csvRowAsObject.reportId = reportModelInstance.id;
            csvRowAsObject.userId = reportModelInstance.userModelToReportModelId;
          });
          var StockOrderLineitemModel = Container.app.models.StockOrderLineitemModel;
          StockOrderLineitemModel.create(arrayOfCsvRowsAsObjects, function(err, results){
            if (err) {
              log('error occured', err);
              console.error('error occured', err);
              next(err);
            }
            else {
              log('created StockOrderLineitemModels:', results.length);

              // TODO: #3 submit a job to the worker infrastructure
              var UserModel = Container.app.models.UserModel;
              UserModel.findById(reportModelInstance.userModelToReportModelId)
                .then(function(userModelInstance){
                  log('userModelInstance', userModelInstance);

                  // (1) generate a token for the worker to use on the currentUser's behalf
                  userModelInstance.createAccessTokenAsync(1209600)// can't be empty ... time to live (in seconds) 1209600 is 2 weeks (default of loopback)
                    .then(function(newAccessToken) {
                      // (2) fetch the report, store and store-config
                      var ReportModel = Container.app.models.ReportModel;
                      ReportModel.getAllRelevantModelInstancesForReportModel(reportModelInstance.id)
                        .spread(function (reportModelInstance, storeModelInstance, storeConfigInstance) {
                          // (3) extract domainPrefix from store-config's posUrl
                          var posUrl = storeConfigInstance.posUrl;
                          var regexp = /^https?:\/\/(.*)\.vendhq\.com$/i;
                          var matches = posUrl.match(regexp);
                          var domainPrefix = matches[1];

                          // (4) Prepare payload for worker
                          var options = ReportModel.preparePayload(storeModelInstance, domainPrefix, newAccessToken, reportModelInstance);

                          ReportModel.sendPayload(reportModelInstance, options, next)
                            .then(function(updatedReportModelInstance){
                              log('updatedReportModelInstance:', updatedReportModelInstance);
                              next();
                            });
                        });
                    });
                });
            }
          });
        })
        .catch(function(error){
          next(error);
        });
    });

    stream.pipe(converter);
    stream.on('error', next);
  });

  var createReportModel = function(filename, Container, next){
    // before: 41st_Gift_Shop-CSC-114340-WeeklyOrder.CSV
    var data = filename.split('-');
    // after: [ 41st_Gift_Shop, CSC, 114340, WeeklyOrder.CSV ]

    var storeName = data[0];
    storeName = storeName.replace(/_/g, '.'); // . is treated as regex when
    log('storeName', storeName);

    var supplierName = data[1];
    supplierName = supplierName.replace(/_/g, '.'); // . is treated as regex when
    log('supplierName', supplierName);

    // TODO: current user should only be able to search his/her own stores and suppliers, not all of them!

    var StoreModel = Container.app.models.StoreModel;
    return StoreModel.findOne({ where: { name: { like: storeName } } })
      .then(function(storeModelInstance){
        log('storeModelInstance', storeModelInstance);
        if(storeModelInstance) {
          var SupplierModel = Container.app.models.SupplierModel;
          return SupplierModel.findOne({ where: { name: { like: supplierName } } })
            .then(function(supplierModelInstance){
              log('supplierModelInstance', supplierModelInstance);
              if(supplierModelInstance) {
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
      })
      .catch(function(error){
        next(error);
      });
  };
};
