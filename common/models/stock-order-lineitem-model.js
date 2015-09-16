'use strict';
var Promise = require('bluebird');
var _ = require('underscore');

var path = require('path');
var fileName = path.basename(__filename, '.js'); // gives the filename without the .js extension
var logger = require('./../lib/debug-extension')('common:models:'+fileName);
var log = logger.debug.bind(logger); // TODO: over time, please use log.LOGLEVEL(msg) explicitly

module.exports = function(StockOrderLineitemModel) {

  // https://github.com/strongloop/loopback/issues/418
  // once a model is attached to the data source
  StockOrderLineitemModel.on('dataSourceAttached', function(obj){
    // wrap the whole model in Promise
    // but we need to avoid 'validate' method
    StockOrderLineitemModel = Promise.promisifyAll(
      StockOrderLineitemModel,
      {
        filter: function(name, func, target){
          return !( name == 'validate');
        }
      }
    );
  });

  StockOrderLineitemModel.StockOrderLineitemModelStates = {
    'PENDING': 'pending',
    'ORDERED': 'complete',
    'BOXED': 'boxed',
    'UNBOXED': 'unboxed'
  };

  StockOrderLineitemModel.observe('before save', function updateTimestamp(ctx, next) {
    if (ctx.instance) {
      ctx.instance.updatedAt = new Date();
    } else {
      ctx.data.updatedAt = new Date();
    }
    next();
  });

  StockOrderLineitemModel.remoteMethod('updateBasedOnState', {
    accepts: [
      {arg: 'id', type: 'string', required: true},
      {arg: 'attributes', type: 'object', required: true}
    ],
    http: {path: '/:id/updateBasedOnState', verb: 'put'},
    returns: {arg: 'updatedStockOrderLineitemModelInstance', type: 'object', root:true}
  });

  StockOrderLineitemModel.remoteMethod('deleteLineitem', {
    accepts: [
      {arg: 'id', type: 'string', required: true}
    ],
    http: {path: '/:id/deleteLineitem', verb: 'put'},
    returns: {arg: 'deleted', type: 'object', root:true}
  });

  StockOrderLineitemModel.updateBasedOnState = function(id, attributes, cb) {
    var methodName = 'updateBasedOnState';
    log(methodName, '> start');
    var currentUser = StockOrderLineitemModel.getCurrentUserModel(cb); // returns  immediately if no currentUser
    if(currentUser) {
      StockOrderLineitemModel.findById(id) // chain the promise via a return statement so unexpected rejections/errors float up
        .then(function(stockOrderLineitemModelInstance) {
          log(methodName, '> findById > then', '\n',
            '> stockOrderLineitemModelInstance', stockOrderLineitemModelInstance);

          log(methodName, '> findById > then', '\n',
            '> extending StockOrderLineitemModel with attributes:', attributes);
          _.extend(stockOrderLineitemModelInstance, attributes); // TODO: validate user-input?
          log(methodName, '> findById > then', '\n',
            '> extended StockOrderLineitemModel:', stockOrderLineitemModelInstance);

          var ReportModel = StockOrderLineitemModel.app.models.ReportModel;
          ReportModel.getAllRelevantModelInstancesForReportModel(stockOrderLineitemModelInstance.reportId)
            .spread(function(reportModelInstance, storeModelInstance/*, storeConfigInstance*/){
              var oauthVendUtil = require('./../../common/utils/vend')({
                'GlobalConfigModel': StockOrderLineitemModel.app.models.GlobalConfigModel,
                'StoreConfigModel': StockOrderLineitemModel.app.models.StoreConfigModel,
                'currentUser': currentUser
              });
              if (reportModelInstance.state === ReportModel.ReportModelStates.MANAGER_IN_PROCESS)
              {
                log(methodName, '> findById > then > spread > MANAGER_IN_PROCESS', '\n',
                  '> work on consignment products in Vend');
                if(!stockOrderLineitemModelInstance.vendConsignmentProductId &&
                   stockOrderLineitemModelInstance.state !== StockOrderLineitemModel.StockOrderLineitemModelStates.ORDERED){
                  log(methodName, '> findById > then > spread > MANAGER_IN_PROCESS > !ORDERED', '\n',
                    '> will create a consignment product in Vend');
                  oauthVendUtil.createStockOrderLineitemForVend(storeModelInstance, reportModelInstance, stockOrderLineitemModelInstance)
                    .then(function(newConsignmentProduct){
                      log(methodName, '> findById > then > spread > MANAGER_IN_PROCESS > !ORDERED > create > then', '\n',
                        '> created a consignment product in Vend');
                      log(methodName, '> findById > then > spread > MANAGER_IN_PROCESS > !ORDERED > create > then', '\n',
                        '> newConsignmentProduct', newConsignmentProduct);
                      stockOrderLineitemModelInstance.vendConsignmentProductId = newConsignmentProduct.id;
                      stockOrderLineitemModelInstance.vendConsignmentProduct = newConsignmentProduct;
                      if(!attributes.state || attributes.state !== StockOrderLineitemModel.StockOrderLineitemModelStates.PENDING) {
                        log(methodName, '> findById > then > spread > MANAGER_IN_PROCESS > !ORDERED > create > then', '\n',
                          '> since client did not specifically ask for the row to be left in PENDING state ... change its status to the next one');
                        stockOrderLineitemModelInstance.state = StockOrderLineitemModel.StockOrderLineitemModelStates.ORDERED;
                      }
                      else {
                        log(methodName, '> findById > then > spread > MANAGER_IN_PROCESS > !ORDERED > create > then', '\n',
                          '> client specifically asked for the row to be left in PENDING state');
                      }
                      stockOrderLineitemModelInstance.save()
                        .then(function(updatedStockOrderLineitemModelInstance){
                          log(methodName, '> findById > then > spread > MANAGER_IN_PROCESS > !ORDERED > create > then > save > then', '\n',
                            '> updated the lineitem model');
                          cb(null, updatedStockOrderLineitemModelInstance);
                        });
                    },
                    function(error){
                      cb(error);
                    });
                }
                else { // is already in StockOrderLineitemModel.StockOrderLineitemModelStates.ORDERED state
                  log(methodName, '> findById > then > spread > MANAGER_IN_PROCESS > ORDERED', '\n',
                    '> will update the consignment product in Vend');
                  oauthVendUtil.updateStockOrderLineitemForVend(storeModelInstance, reportModelInstance, stockOrderLineitemModelInstance)
                    .then(function(updatedConsignmentProduct){
                      log(methodName, '> findById > then > spread > MANAGER_IN_PROCESS > ORDERED > update > then', '\n',
                        '> updated the consignment product in Vend');
                      log(methodName, '> findById > then > spread > MANAGER_IN_PROCESS > ORDERED > update > then', '\n',
                        '> updatedConsignmentProduct', updatedConsignmentProduct);
                      stockOrderLineitemModelInstance.vendConsignmentProduct = updatedConsignmentProduct;
                      if(!attributes.state || attributes.state !== StockOrderLineitemModel.StockOrderLineitemModelStates.PENDING) {
                        log(methodName, '> findById > then > spread > MANAGER_IN_PROCESS > ORDERED > update > then', '\n',
                          '> since client did not specifically ask for the row to be left in PENDING state ... change its status to the next one');
                        stockOrderLineitemModelInstance.state = StockOrderLineitemModel.StockOrderLineitemModelStates.ORDERED;
                      }
                      else {
                        log(methodName, '> findById > then > spread > MANAGER_IN_PROCESS > ORDERED > update > then', '\n',
                          '> client specifically asked for the row to be left in PENDING state');
                      }
                      stockOrderLineitemModelInstance.save()
                        .then(function(updatedStockOrderLineitemModelInstance){
                          log(methodName, '> findById > then > spread > MANAGER_IN_PROCESS > ORDERED > update > then > save > then', '\n',
                            '> updated the lineitem model');
                          cb(null, updatedStockOrderLineitemModelInstance);
                        });
                    },
                    function(error){
                      cb(error);
                    });
                }
              }
              else if (reportModelInstance.state === StockOrderLineitemModel.app.models.ReportModel.ReportModelStates.MANAGER_RECEIVE)
              {
                if (!stockOrderLineitemModelInstance.vendConsignmentProductId) {
                  log(methodName, '> findById > then > spread > MANAGER_RECEIVE', '\n',
                    '> will create a consignment product in Vend');
                  oauthVendUtil.createStockOrderLineitemForVend(storeModelInstance, reportModelInstance, stockOrderLineitemModelInstance)
                    .then(function(newConsignmentProduct){
                      log(methodName, '> findById > then > spread > MANAGER_RECEIVE > create > then', '\n',
                        '> created a consignment product in Vend');
                      log(methodName, '> findById > then > spread > MANAGER_RECEIVE > create > then', '\n',
                        '> newConsignmentProduct', newConsignmentProduct);
                      stockOrderLineitemModelInstance.vendConsignmentProductId = newConsignmentProduct.id;
                      stockOrderLineitemModelInstance.vendConsignmentProduct = newConsignmentProduct;
                      // TODO: should it not be left up to client side to send this property via `attributes` ?
                      //stockOrderLineitemModelInstance.state = StockOrderLineitemModel.StockOrderLineitemModelStates.UNBOXED;
                      stockOrderLineitemModelInstance.save()
                        .then(function(updatedStockOrderLineitemModelInstance){
                          log(methodName, '> findById > then > spread > MANAGER_RECEIVE > create > then > save > then', '\n',
                            '> updated the lineitem model');
                          cb(null, updatedStockOrderLineitemModelInstance);
                        });
                    },
                    function(error){
                      cb(error);
                    });
                }
                else {
                  log(methodName, '> findById > then > spread > MANAGER_RECEIVE', '\n',
                    '> will update the existing consignment product in Vend');
                  oauthVendUtil.updateStockOrderLineitemForVend(storeModelInstance, reportModelInstance, stockOrderLineitemModelInstance)
                    .then(function(updatedConsignmentProduct){
                      log(methodName, '> findById > then > spread > MANAGER_RECEIVE > update > then', '\n',
                        '> updated the consignment product in Vend');
                      log(methodName, '> findById > then > spread > MANAGER_RECEIVE > update > then', '\n',
                        '> updatedConsignmentProduct', updatedConsignmentProduct);
                      stockOrderLineitemModelInstance.vendConsignmentProduct = updatedConsignmentProduct;
                      stockOrderLineitemModelInstance.save()
                        .then(function(updatedStockOrderLineitemModelInstance){
                          log(methodName, '> findById > then > spread > MANAGER_RECEIVE > update > then > save > then', '\n',
                            '> updated the lineitem model');
                          cb(null, updatedStockOrderLineitemModelInstance);
                        });
                    },
                    function(error){
                      cb(error);
                    });
                }
              }
              else {
                cb(null, {updated:false});
              }
            });
        },
        function(error){
          cb(error);
        });
    }
  };

  StockOrderLineitemModel.deleteLineitem = function(id, cb) {
    var methodName = 'deleteLineitem';
    log('inside '+methodName+'()');
    var currentUser = StockOrderLineitemModel.getCurrentUserModel(cb); // returns immediately if no currentUser
    if(currentUser) {
      StockOrderLineitemModel.findById(id) // chain the promise via a return statement so unexpected rejections/errors float up
        .then(function(stockOrderLineitemModelInstance) {
          log('inside '+methodName+'() - stockOrderLineitemModelInstance', stockOrderLineitemModelInstance);
          var waitFor1;
          if (stockOrderLineitemModelInstance.vendConsignmentProductId) {
            var ReportModel = StockOrderLineitemModel.app.models.ReportModel;
            waitFor1 = ReportModel.getAllRelevantModelInstancesForReportModel(stockOrderLineitemModelInstance.reportId)
              .spread(function(reportModelInstance, storeModelInstance/*, storeConfigInstance*/){
                var oauthVendUtil = require('./../../common/utils/vend')({
                  'GlobalConfigModel': StockOrderLineitemModel.app.models.GlobalConfigModel,
                  'StoreConfigModel': StockOrderLineitemModel.app.models.StoreConfigModel,
                  'currentUser': currentUser
                });
                if (reportModelInstance.state === ReportModel.ReportModelStates.MANAGER_IN_PROCESS)
                {
                  log('inside '+methodName+'() - will delete consignment product from Vend');
                  return oauthVendUtil.deleteStockOrderLineitemForVend(storeModelInstance, reportModelInstance, stockOrderLineitemModelInstance)
                    .then(function(response){
                      log('response from vend:', response);
                      return Promise.resolve(); // NOTE: empty/undefined value indicates success to the next block in promise chain
                    },
                    function(error){
                      log('ERROR', error);
                      console.error(error);
                      return Promise.resolve({deleted:false});
                    });
                }
                else {
                  log('inside '+methodName+'() - will not delete consignment product from Vend for current ReportModel state:', reportModelInstance.state);
                  return Promise.resolve({deleted:false});
                }
              });
          }
          else {
            log('inside '+methodName+'() - no consignment product available in Vend for deletion');
            waitFor1 = Promise.resolve({deleted:false});
          }
          waitFor1.then(function(result){
              if(result) {
                log('inside '+methodName+'() - did not delete a consignment product from Vend');
              }
              else { // NOTE: empty/undefined value indicates success in this block of promise chain
                log('inside ' + methodName + '() - deleted a consignment product from Vend');
              }
              log('inside '+methodName+'() - will delete the StockOrderLineitemModel');
              return stockOrderLineitemModelInstance.destroy()
                .then(function(){
                  log('inside '+methodName+'() - deleted the StockOrderLineitemModel');
                  cb(null, {deleted:true});
                });
            },
            function(error){
              cb(error);
            });
        });
    }
  };

};
