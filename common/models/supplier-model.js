var Promise = require('bluebird');

/*var path = require('path');
 var fileName = path.basename(__filename, '.js'); // gives the filename without the .js extension
 var log = require('./../lib/debug-extension')('common:models:'+fileName);*/

module.exports = function (SupplierModel) {

  // https://github.com/strongloop/loopback/issues/418
  // once a model is attached to the data source
  SupplierModel.on('dataSourceAttached', function (obj) {
    // wrap the whole model in Promise
    // but we need to avoid 'validate' method
    SupplierModel = Promise.promisifyAll(
      SupplierModel,
      {
        filter: function (name, func, target) {
          return !( name == 'validate');
        }
      }
    );
  });

  SupplierModel.listSuppliers = function (cb) {
    var currentUser = SupplierModel.getCurrentUserModel(cb); // returns immediately if no currentUser
    if (currentUser) {
      //log('find out any and all teams (ownerID) that the currentUser is a member of');
      var TeamModel = SupplierModel.app.models.TeamModel;
      TeamModel.find({where: {memberId: currentUser.id}}) // don't send a `return`, it will cause dual invocation of callback
        .then(function (teamModels) {
          //log('teamModels', teamModels);
          //log('TODO: for each team (ownerID) get the respective suppliers and return the results');
          if (teamModels && teamModels.length === 1) {
            // ASSUMPTION: (short-cut) currentUser only belongs to one team
            SupplierModel.find({
              where: {
                and: [
                  {userId: teamModels[0].ownerId},
                  {isActive: true}
                ]
              }
            }, cb);
          }
          else {
            // checking TeamModel via count() of find() use extra cycles
            // which we can shortcut if we assume that hte user might be an $owner
            // if that is not the case, an empty result is provided, which is
            // almost as acceptable as an error
            SupplierModel.find({where: {
              and: [
                {userId: currentUser.id},
                {isActive: true}
              ]
            }}, cb); //cb('user should be part of exactly one team');
          }
        });
    }
  };

  SupplierModel.remoteMethod('listSuppliers', {
    accepts: [],
    http: {path: '/listSuppliers', verb: 'get'},
    returns: {arg: 'suppliers', type: 'array', root: true}
  });

};
