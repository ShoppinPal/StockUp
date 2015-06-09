'use strict';
var Promise = require('bluebird');

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

  StockOrderLineitemModel.observe('before save', function updateTimestamp(ctx, next) {
    if (ctx.instance) {
      ctx.instance.updatedAt = new Date();
    } else {
      ctx.data.updatedAt = new Date();
    }
    next();
  });
};
