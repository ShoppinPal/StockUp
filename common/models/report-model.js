'use strict';

var Promise = require('bluebird');
var request = require('request-promise');
var _ = require('underscore');

var path = require('path');
var fileName = path.basename(__filename, '.js'); // gives the filename without the .js extension
var log = require('debug')('common:models:'+fileName);

module.exports = function(ReportModel) {

  // https://github.com/strongloop/loopback/issues/418
  // once a model is attached to the data source
  ReportModel.on('dataSourceAttached', function(obj){
    // wrap the whole model in Promise
    // but we need to avoid 'validate' method
    ReportModel = Promise.promisifyAll(
      ReportModel,
      {
        filter: function(name, func, target){
          return !( name == 'validate');
        }
      }
    );
  });

  ReportModel.ReportModelStates = {
    'REPORT_EMPTY': 'report_empty',
    'MANAGER_NEW_ORDERS': 'manager_new_orders',
    'MANAGER_IN_PROCESS': 'manager_in_process',
    'WAREHOUSE_FULFILL': 'warehouse_fulfill',
    'MANAGER_RECEIVE': 'manager_receive',
    'REPORT_COMPLETE': 'report_complete'
  };

  ReportModel.remoteMethod('getWorkerStatus', {
    accepts: [
      {arg: 'id', type: 'string', required: true}
    ],
    http: {path: '/:id/getWorkerStatus', verb: 'get'},
    returns: {arg: 'reportModelInstance', type: 'object', root:true}
  });

  ReportModel.remoteMethod('generateStockOrderReportForManager', {
    accepts: [
      {arg: 'id', type: 'string', required: true}
    ],
    http: {path: '/:id/generateStockOrderReportForManager', verb: 'get'},
    returns: {arg: 'reportModelInstance', type: 'object', root:true}
  });

  /*ReportModel.remoteMethod('getRows', {
    accepts: [
      {arg: 'id', type: 'string', required: true}
    ],
    http: {path: '/:id/rows', verb: 'get'},
    returns: {arg: 'rows', type: 'array', root:true}
  });*/

  ReportModel.remoteMethod('getRows', {
    accepts: [
      {arg: 'id', type: 'string', required: true},
      {arg: 'pageSize', type: 'number', required: false},
      {arg: 'pageNumber', type: 'number', required: false}
    ],
    http: {path: '/getRows', verb: 'get'},
    returns: {arg: 'rows', type: 'array', root:true}
  });

  ReportModel.remoteMethod('updateRows', {
    accepts: [
      {arg: 'id', type: 'string', required: true},
      {arg: 'rows', type: 'srray', required: true}
    ],
    http: {path: '/updateRows', verb: 'put'}
  });

  ReportModel.remoteMethod('setReportStatus', {
    accepts: [
      {arg: 'id', type: 'string', required: true},
      {arg: 'from', type: 'string', required: true},
      {arg: 'to', type: 'string', required: true}
    ],
    http: {path: '/:id/setReportStatus', verb: 'put'},
    returns: {arg: 'updatedReportModelInstance', type: 'object', root:true}
  });

  var ClientError = function ClientError(e) {
    return e.statusCode >= 400 && e.statusCode < 500;
  };
  var successHandler = function(response) {
    if(_.isArray(response)) {
      console.log('response is an array');
    }
    else if(_.isObject(response)) {
      console.log('response is an object');
      return Promise.resolve(response);
    }
    else if(_.isString(response)) {
      console.log('response is a string');
      try{
        var responseObject = JSON.parse(response);
        //console.log(responseObject);
        return Promise.resolve(responseObject);
      }
      catch(error){
        console.error('caught an error: ', error);
        throw error;
      }
    }
    else {
      console.log(response);
    }
  };

  ReportModel.getAllRelevantModelInstancesForReportModel = function(id){
    /// TODO: once the loopback framework starts supporting the INCLUDE filter with FINDBYID() ... use it!
    return ReportModel.findById(id) // chain the promise via a return statement so unexpected rejections/errors float up
      .then(function(reportModelInstance) {
        log('print object for reportModelInstance: ', reportModelInstance);
        // TODO: is findOne buggy? does it return a result even when there are no matches?
        return ReportModel.app.models.StoreModel.findOne( // chain the promise via a return statement so unexpected rejections/errors float up
          {
            where: {'api_id': reportModelInstance.outlet.id}, //assumption: there aren't any duplicate entries
            include: 'storeConfigModel' // (4) also fetch the store-config
          }
        )
          .then(function(storeModelInstance) {
            log('print object for storeModelInstance: ', storeModelInstance);
            var storeConfigInstance = storeModelInstance.storeConfigModel();
            log('print object for storeConfigInstance: ', storeConfigInstance);
            return Promise.resolve([reportModelInstance, storeModelInstance, storeConfigInstance]);
          });
      });
  };

  ReportModel.getRows = function(id, pageSize, pageNumber, cb) {
    var currentUser = ReportModel.getCurrentUserModel(cb); // returns immediately if no currentUser
    if (currentUser) {
      ReportModel.findById(id)
        .then(function (reportModelInstance) {
          log('reportModelInstance', reportModelInstance);

          // TODO: check if the currentUser is the $owner of ReportModel or not?
          //log('Is %s equal to %s?', reportModelInstance.userModelToReportModelId, currentUser.id);

          var filters = {};
          if (_.isNumber(pageSize)) {
            filters.limit = pageSize;
            if (_.isNumber(pageNumber)) {
              filters.skip = ( ( pageNumber - 1 ) * pageSize );
            }
          }
          reportModelInstance.stockOrderLineitemModels(filters, function(err, data) {
            if (err) {
              console.error(err);
              cb(err);
            }
            //log('data', data);
            cb(null, data);
          });
        });
    }
  };

  ReportModel.updateRows = function(id, rows, cb) {
    var currentUser = ReportModel.getCurrentUserModel(cb); // returns immediately if no currentUser
    if (currentUser) {
      ReportModel.findById(id)
        .then(function (reportModelInstance) {
          log('reportModelInstance', reportModelInstance);
          log('rows.length', rows.length);

          // TODO: check if the currentUser is the $owner of ReportModel or not?
          //log('Is %s equal to %s?', reportModelInstance.userModelToReportModelId, currentUser.id);

          // NOTE(s):
          // http://mongodb.github.io/node-mongodb-native/2.0/api/Collection.html#initializeUnorderedBulkOp

          // (1) Get the collection
          var col = ReportModel.dataSource.adapter.collection('StockOrderLineitemModel');
          //log('collection', col);

          // (2) Initialize the unordered Batch
          var batch = col.initializeUnorderedBulkOp();

          // (3) Add some operations to be executed
          _.each(rows,function(row){
            //log('_.omit(row,\'id\')', _.omit(row,'id'));
            var ObjectID = require('./../../node_modules/loopback-connector-mongodb/node_modules/mongodb').ObjectID;
            // TODO: need to (a) either remove all the ObejctId(s) otherwise they'll be overwritten as Strings,
             //      or (b) cast them properly before sending,
             //      or (c) cast them properly and instead of sending the whole object, send the diff only
            batch.find({'_id': new ObjectID(row.id)}).updateOne({$set: _.omit(row,'id','reportId','userId')});
            // TODO: updatedAt doesn't get a new timestamp
          });

          // (4) Execute the operations
          batch.execute(function(err, result) {
            //log('(4) result', result);
            cb(null);
          }, function(error){
            console.error('report-model.js - updateRows - An unexpected error occurred: ', error);
            cb(error);
          });

          cb(null);
        });
    }
  };

  ReportModel.generateStockOrderReportForManager = function(id, cb) {
    var currentUser = ReportModel.getCurrentUserModel(cb); // returns  immediately if no currentUser
    if(currentUser) {
      // (1) generate a token for the worker to use on the currentUser's behalf
      currentUser.createAccessTokenAsync(1209600)// can't be empty ... time to live (in seconds) 1209600 is 2 weeks (default of loopback)
        .then(function(newAccessToken){
          // (2) fetch the report, store and store-config
          return ReportModel.getAllRelevantModelInstancesForReportModel(id)
            .spread(function(reportModelInstance, storeModelInstance, storeConfigInstance){
              // (3) extract domainPrefix from store-config's posUrl
              var posUrl = storeConfigInstance.posUrl;
              var regexp = /^https?:\/\/(.*)\.vendhq\.com$/i;
              var matches = posUrl.match(regexp);
              var domainPrefix = matches[1];

              // (4) Prepare payload for worker
              var options = ReportModel.preparePayload(storeModelInstance, domainPrefix, newAccessToken, reportModelInstance);

              return ReportModel.sendPayload(reportModelInstance, options, cb)
                .then(function(updatedReportModelInstance){
                  log('return the updated ReportModel');
                  cb(null, updatedReportModelInstance);
                });
            });
        },
        function(error){
          cb(error);
        });
    }
  };

  ReportModel.preparePayload = function(storeModelInstance, domainPrefix, newAccessToken, reportModelInstance){
    return {
      url: ReportModel.app.get('ironWorkersUrl'),
      qs: {
        'oauth': ReportModel.app.get('ironWorkersOauthToken'),
        'code_name': ReportModel.app.get('stockOrderWorker'),
        'priority': 1
      },
      json: {
        tokenService: 'https://{DOMAIN_PREFIX}.vendhq.com/api/1.0/token', //TODO: fetch from global-config or config.*.json
        clientId: ReportModel.app.get('vend').client_id,
        clientSecret: ReportModel.app.get('vend').client_secret,
        tokenType: 'Bearer',
        accessToken: storeModelInstance.storeConfigModel().vendAccessToken,//'XN4ceup1M9Rp6Sf1AqeqarDjN9TMa06Mwr15K7lk',
        refreshToken: storeModelInstance.storeConfigModel().vendRefreshToken,//'qSl8JF9fD2UMGAZfpsN2yr2d8XRNZgmQEKh7v5jp',
        domainPrefix: domainPrefix, //'fermiyontest', // TODO: extract from storeConfigModelInstance.posUrl
        loopbackServerUrl: process.env['site:baseUrl'] || ReportModel.app.get('site').baseUrl,
        //loopbackServerHost: 'mppulkit1.localtunnel.me',
        //loopbackServerPort: '443',
        loopbackAccessToken: newAccessToken, // let it be the full json object
        reportId: reportModelInstance.id,
        outletName: reportModelInstance.outlet.name,
        supplierName: reportModelInstance.supplier.name,
        outletId: reportModelInstance.outlet.id,//'aea67e1a-b85c-11e2-a415-bc764e10976c',
        supplierId: reportModelInstance.supplier.id//'c364c506-f8f4-11e3-a0f5-b8ca3a64f8f4'
      }
    };
  };

  ReportModel.sendPayload = function(reportModelInstance, options, cb){
    log('will send a request with', 'options:', JSON.stringify(options,null,2));
    return request.post(options)
      .then(successHandler)
      .then(function(data){
        log('save the task info in ReportModel', JSON.stringify(data,null,2));
        return reportModelInstance.updateAttributes({
          workerTaskId: data.id,
          workerStatus: data.msg
        });
      })
      .catch(ClientError, function(e) {
        var message = e.response.body;
        if(_.isObject(message)) {
          message = JSON.stringify(message,null,2);
        }
        console.error('A ClientError happened: \n'
          + e.statusCode + ' ' + message + '\n'
          /*+ JSON.stringify(e.response.headers,null,2)
           + JSON.stringify(e,null,2)*/
        );
        // TODO: add retry logic?
        //return Promise.reject(e.statusCode + ' ' + message); // TODO: throw unknown errors but reject well known errors?
        cb(e.statusCode + ' ' + message);
      })
      .catch(function(e) {
        console.error('report-model.js - generateStockOrderReportForManager - An unexpected error occurred: ', e);
        //throw e; // TODO: throw unknown errors but reject well known errors?
        //return Promise.reject(e);
        cb(e);
      });
  };

  ReportModel.getWorkerStatus = function(id, cb) {
    var currentUser = ReportModel.getCurrentUserModel(cb); // returns  immediately if no currentUser
    if(currentUser) {
      // (1) fetch the report
      ReportModel.findById(id, function (error, reportModelInstance) {
        //log('reportModelInstance:', reportModelInstance);

        // (2) setup the iron worker client
        var IronWorker = require('iron_worker');
        var workerClient = new IronWorker.Client({
          token: ReportModel.app.get('ironWorkersOauthToken'),
          'project_id': ReportModel.app.get('ironWorkersProjectId')
        });

        // (3) fetch the task status
        if(reportModelInstance.workerTaskId) {
          workerClient.tasksGet(reportModelInstance.workerTaskId, function(error, body) {
            if (error) {
              console.error(error);
              return cb(error);
            }
            log(JSON.stringify(body, null, 2));
            //return cb(null, body);
            return reportModelInstance.updateAttributes({
              workerStatus: body.msg || body.status
            })
              .then(function(updatedReportModelInstance){
                log('return the updated ReportModel');
                cb(null, updatedReportModelInstance);
              });
          });
        }
        else {
          cb(null);
        }
      });
    }
  };

  ReportModel.setReportStatus = function(id, from, to, cb) {
    log('inside setReportStatus()');
    var currentUser = ReportModel.getCurrentUserModel(cb); // returns  immediately if no currentUser
    if(currentUser) {
      ReportModel.getAllRelevantModelInstancesForReportModel(id)
        .spread(function(reportModelInstance, storeModelInstance, storeConfigInstance){
          var oauthVendUtil = require('./../../common/utils/vend')({
            'GlobalConfigModel': ReportModel.app.models.GlobalConfigModel,
            'StoreConfigModel': ReportModel.app.models.StoreConfigModel,
            'currentUser': currentUser
          });
          log('from', from, '\n',
            'reportModelInstance.state', reportModelInstance.state, '\n',
            'to', to
          );
          if (from === reportModelInstance.state &&
              reportModelInstance.state === ReportModel.ReportModelStates.MANAGER_NEW_ORDERS &&
              to === ReportModel.ReportModelStates.MANAGER_IN_PROCESS)
          {
            log('inside setReportStatus() - will create a stock order in Vend');
            oauthVendUtil.createStockOrderForVend(storeModelInstance, reportModelInstance)
              .then(function(newStockOrder){
                log('inside setReportStatus() - PASS - created a stock order in Vend', newStockOrder);
                reportModelInstance.vendConsignmentId = newStockOrder.id;
                reportModelInstance.vendConsignment = newStockOrder;
                reportModelInstance.state = ReportModel.ReportModelStates.MANAGER_IN_PROCESS;
                reportModelInstance.save()
                  .then(function(updatedReportModelInstance){
                    log('inside setReportStatus() - PASS - updated the report model');
                    cb(null, updatedReportModelInstance);
                  });
              },
              function(error){
                cb(error);
              });
          }
          else if (from === reportModelInstance.state &&
                   reportModelInstance.state === ReportModel.ReportModelStates.MANAGER_IN_PROCESS &&
                   to === ReportModel.ReportModelStates.WAREHOUSE_FULFILL)
          {
            log('inside setReportStatus() - will update the status of stock order in Vend to SENT');
            oauthVendUtil.markStockOrderAsSent(storeModelInstance, reportModelInstance)
              .then(function(updatedStockOrder){
                log('inside setReportStatus() - PASS - updated stock order in Vend to SENT', updatedStockOrder);
                reportModelInstance.vendConsignment = updatedStockOrder;
                reportModelInstance.state = ReportModel.ReportModelStates.WAREHOUSE_FULFILL;
                reportModelInstance.save()
                  .then(function(updatedReportModelInstance){
                    log('inside setReportStatus() - PASS - updated the report model');
                    cb(null, updatedReportModelInstance);
                  });
              },
              function(error){
                cb(error);
              });
          }
          else if (from === reportModelInstance.state &&
                   reportModelInstance.state === ReportModel.ReportModelStates.MANAGER_RECEIVE &&
                   to === ReportModel.ReportModelStates.REPORT_COMPLETE)
          {
            log('inside setReportStatus() - will update the status of stock order in Vend to RECEIVED');
            oauthVendUtil.markStockOrderAsReceived(storeModelInstance, reportModelInstance)
              .then(function(updatedStockOrder){
                log('inside setReportStatus() - PASS - updated stock order in Vend to RECEIVED', updatedStockOrder);
                reportModelInstance.vendConsignment = updatedStockOrder;
                reportModelInstance.state = ReportModel.ReportModelStates.REPORT_COMPLETE;
                reportModelInstance.save()
                  .then(function(updatedReportModelInstance){
                    log('inside setReportStatus() - PASS - updated the report model');
                    cb(null, updatedReportModelInstance);
                  });
              },
              function(error){
                cb(error);
              });
          }
          else {
            cb(null, {updated:false});
          }
        });
    }
  };
};
