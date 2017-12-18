var Promise = require('bluebird');

/*var path = require('path');
var fileName = path.basename(__filename, '.js'); // gives the filename without the .js extension
var log = require('./../lib/debug-extension')('common:models:'+fileName);*/

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

  SupplierModel.listSuppliers = function (id, cb) {
    var currentUser = SupplierModel.getCurrentUserModel(cb); // returns immediately if no currentUser
    if (currentUser) {
      SupplierModel.app.models.UserModel.find({
        where: {
          id: id
        },
        include: {
          relation: 'storeConfigModel',
          scope: {
            include: 'supplierModels'
          }
        }
      })
        .then(function (response) {
          /**
           * just a hack, this is not how supplier models should be fetched,
           * they have to be fetched by a relationship with storeConfigModel
           * and the api should only accept storeConfigModelId as id
           */
          cb(null, response[0].storeConfigModel().supplierModels());
        })
        .catch(function (error) {
          console.log('error');
          cb(error);
        });
    }
  };

  SupplierModel.remoteMethod('listSuppliers', {
    accepts: [
      {arg: 'id', type: 'string', required: true, description: 'User ID'}
    ],
    http: {path: '/listSuppliers', verb: 'get'},
    returns: {arg: 'suppliers', type: 'array', root:true}
  });

};
