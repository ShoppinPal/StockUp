var Promise = require('bluebird');

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

};
