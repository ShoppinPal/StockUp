var loopback = require('loopback');
var Promise = require('bluebird');

// HINT(s):
//   Getting the app object: http://docs.strongloop.com/display/public/LB/Working+with+LoopBack+objects
//   From a model script: http://docs.strongloop.com/display/public/LB/Working+with+LoopBack+objects#WorkingwithLoopBackobjects-Fromamodelscript
module.exports = function(StoreModel) {

  // https://github.com/strongloop/loopback/issues/418
  // once a model is attached to the data source
  StoreModel.on('dataSourceAttached', function(obj){
    // wrap the whole model in Promise
    // but we need to avoid 'validate' method
    StoreModel = Promise.promisifyAll(
      StoreModel,
      {
        filter: function(name, func, target){
          return !( name == 'validate');
        }
      }
    );
  });

  StoreModel.importProducts = function(id, cb) {
    var ctx = loopback.getCurrentContext();
    var currentUser = ctx && ctx.get('currentUser');
    if (currentUser) {
      console.log('inside StoreModel.importProducts() - currentUser: ', currentUser.username);

      // TODO: the following THEN blocks can be lined up and don't have to be nested

      // (1)
      StoreModel.findByIdAsync(id)
        .then(function(storeModel){
          console.log('print object for storeModel: ', storeModel);

          // (2)
          StoreModel.app.models.StoreConfigModel.findOneAsync( //TODO: use findByIdAsync instead?
            {filter:{where: {id: id}}} // TODO: how can the same ID be used for both store and store-config???
          )
            .then(function(storeConfigModel){
              console.log('print object for storeConfigModel: ', storeConfigModel);

              // (3)
              StoreModel.app.models.GlobalConfigModel.findOneAsync({})
                .then(function(globalConfigModel){
                  console.log('print object for globalConfigModel: ', globalConfigModel);

                  // (4)
                  startProductImportJob(storeModel, storeConfigModel, globalConfigModel)
                    .then(function(result){
                      console.log('inside StoreModel.importProducts() - finished', result);
                      cb(null, result);
                    }, function(error){
                      cb(error);
                    });

                })
                .catch(function(error){
                  cb(error);
                });

              cb(null);
            })
            .catch(function(error){
              cb(error);
            });
        })
        .catch(function(error){
          cb(error);
        });
    }
    else {
      cb('401 - unauthorized - how did we end up here? should we manage ACL access to remote methods ourselves?');
    }
  };

  StoreModel.remoteMethod(
    'importProducts',
    {
      accepts: [
        {arg: 'id', type: 'number', required: true}
      ],
      //http: {path:'/import-products', verb: 'get'}
      http: {path: '/:id/import-products', verb: 'get'}
    }
  );

  var q = require('q')
    , responseHandler = require('../utils/response-handler')
    , request = require('request');

  var startProductImportJob = function(storeModel, storeConfigModel, globalConfigModel) {
    console.log('inside startProductImportJob() - store id: ' + storeModel.objectId);
    console.log(JSON.stringify({
      'store': storeModel,
      'storeConfig': storeConfigModel,
      'globalConfig': globalConfigModel
    },null,2));

    var deferred = q.defer();
    request.post({
      url: StoreModel.app.get('ironWorkersUrl'),
      qs: {
        'code_name': StoreModel.app.get('productImportWorker'),
        'oauth': StoreModel.app.get('ironWorkersOauthToken'),
        'priority': 1
      },
      json: {
        'store': storeModel,
        'storeConfig': storeConfigModel,
        'globalConfig': globalConfigModel
      }
    }, function(err, resp, body){
      responseHandler.processResponse(err, resp, body)
        .then(function(result){
          deferred.resolve(result);
        },
        function(error){
          deferred.reject(error);
        });
    });

    return deferred.promise;
  };

};
