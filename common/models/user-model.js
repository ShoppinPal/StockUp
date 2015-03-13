var Promise = require('bluebird');

module.exports = function(UserModel) {

  // https://github.com/strongloop/loopback/issues/418
  // once a model is attached to the data source
  UserModel.on('dataSourceAttached', function(obj){
    // wrap the whole model in Promise
    // but we need to avoid 'validate' method
    UserModel = Promise.promisifyAll(
      UserModel,
      {
        filter: function(name, func, target){
          return !( name == 'validate');
        }
      }
    );
  });

};
