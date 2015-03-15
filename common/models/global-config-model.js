var Promise = require('bluebird');

module.exports = function(GlobalConfigModel) {

  // https://github.com/strongloop/loopback/issues/418
  // once a model is attached to the data source
  GlobalConfigModel.on('dataSourceAttached', function(obj){
    // wrap the whole model in Promise
    // but we need to avoid 'validate' method
    GlobalConfigModel = Promise.promisifyAll(
      GlobalConfigModel,
      {
        filter: function(name, func, target){
          return !( name == 'validate');
        }
      }
    );
  });

};
