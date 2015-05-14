var Promise = require('bluebird');

module.exports = function(SupplierModel) {

  // https://github.com/strongloop/loopback/issues/418
  // once a model is attached to the data source
  SupplierModel.on('dataSourceAttached', function(obj){
    // wrap the whole model in Promise
    // but we need to avoid 'validate' method
    SupplierModel = Promise.promisifyAll(
      SupplierModel,
      {
        filter: function(name, func, target){
          return !( name == 'validate');
        }
      }
    );
  });

};
