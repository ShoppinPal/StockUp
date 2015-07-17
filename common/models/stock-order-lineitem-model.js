'use strict';
var Promise = require('bluebird');

var path = require('path');
var fileName = path.basename(__filename, '.js'); // gives the filename without the .js extension
var log = require('debug')('common:models:'+fileName);

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

  var StockOrderLineitemModelStates = {
    'PENDING': 'pending',
    'COMPLETE': 'complete'
  };

  StockOrderLineitemModel.observe('before save', function updateTimestamp(ctx, next) {
    if (ctx.instance) {
      ctx.instance.updatedAt = new Date();
    } else {
      ctx.data.updatedAt = new Date();
    }
    next();
  });

  StockOrderLineitemModel.remoteMethod('updateStatus', {
    accepts: [
      {arg: 'id', type: 'string', required: true}
    ],
    http: {path: '/:id/updateStatus', verb: 'put'},
    returns: {arg: 'updatedStockOrderLineitemModelInstance', type: 'object', root:true}
  });

  StockOrderLineitemModel.updateStatus = function(id, cb) {
    log('inside update()');
    var currentUser = StockOrderLineitemModel.getCurrentUserModel(cb); // returns  immediately if no currentUser
    if(currentUser) {
      StockOrderLineitemModel.findById(id) // chain the promise via a return statement so unexpected rejections/errors float up
        .then(function(stockOrderLineitemModelInstance) {
          log('inside update() - stockOrderLineitemModelInstance', stockOrderLineitemModelInstance);
          var ReportModel = StockOrderLineitemModel.app.models.ReportModel;
          ReportModel.getAllRelevantModelInstancesForReportModel(stockOrderLineitemModelInstance.reportId)
            .spread(function(reportModelInstance, storeModelInstance/*, storeConfigInstance*/){
              if (reportModelInstance.state === ReportModel.ReportModelStates.MANAGER_IN_PROCESS)
              {
                log('inside update() - will create a consignment product in Vend');
                var oauthVendUtil = require('./../../common/utils/vend')({
                  'GlobalConfigModel': StockOrderLineitemModel.app.models.GlobalConfigModel,
                  'StoreConfigModel': StockOrderLineitemModel.app.models.StoreConfigModel,
                  'currentUser': currentUser
                });
                oauthVendUtil.createStockOrderLineitemForVend(storeModelInstance, reportModelInstance, stockOrderLineitemModelInstance)
                  .then(function(newConsignmentProduct){
                    log('inside update() - PASS - created a consignment product in Vend');
                    log('newConsignmentProduct', newConsignmentProduct);
                    stockOrderLineitemModelInstance.vendConsignmentProductId = newConsignmentProduct.id;
                    stockOrderLineitemModelInstance.state = StockOrderLineitemModelStates.COMPLETE;
                    stockOrderLineitemModelInstance.save()
                      .then(function(updatedStockOrderLineitemModelInstance){
                        log('inside update() - PASS - updated the lineitem model');
                        cb(null, updatedStockOrderLineitemModelInstance);
                      });
                  },
                  function(error){
                    cb(error);
                  });
              }
              else if (reportModelInstance.state === StockOrderLineitemModel.app.models.ReportModel.ReportModelStates.MANAGER_RECEIVE)
              {
                log('TODO: inside update() - will update the existing consignment product in Vend');
              }
              else {
                cb(null, {updated:false});
              }
            });
        });
    }
  };
};
