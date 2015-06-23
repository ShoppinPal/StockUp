var loopback = require('loopback');
var Promise = require('bluebird');
var _ = require('underscore');

var path = require('path');
var fileName = path.basename(__filename, '.js'); // gives the filename without the .js extension
var log = require('debug')('common:models:'+fileName);

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

  var getCurrentUserModel = function(cb) {
    var ctx = loopback.getCurrentContext();
    var currentUser = ctx && ctx.get('currentUser');
    if (currentUser) {
      log('inside SupplierModel.getCurrentUserModel() - currentUser: ', currentUser.username);
      //return currentUser;
      return Promise.promisifyAll(
        currentUser,
        {
          filter: function(name, func, target){
            return !( name == 'validate');
          }
        }
      );
    }
    else {
      // TODO: when used with core invocations, the call stack can end up here
      //       this error only makes sense to point out failures in RESTful calls
      //       how can this sanity check be made any better?
      cb('401 - unauthorized - how did we end up here? should we manage ACL access to remote methods ourselves?');
    }
  };

  SupplierModel.listSuppliers = function (cb) {
    var currentUser = getCurrentUserModel(cb); // returns  immediately if no currentUser
    if (currentUser) {
      //log('find out any and all teams (ownerID) that the currentUser is a member of');
      var TeamModel = SupplierModel.app.models.TeamModel;
      TeamModel.find({where: {memberId: currentUser.id}}) // don't send a `return`, it will cause dual invocation of callback
        .then(function(teamModels){
          //log('teamModels', teamModels);
          //log('TODO: for each team (ownerID) get the respective suppliers and return the results');
          if (teamModels && teamModels.length === 1) {
            // ASSUMPTION: (short-cut) currentUser only belongs to one team
            SupplierModel.find({where: {userId: teamModels[0].ownerId}}, cb);
          }
          else {
            cb('user should be part of exactly one team');
          }
        });
    }
  };

  SupplierModel.remoteMethod('listSuppliers', {
    accepts: [],
    http: {path: '/listSuppliers', verb: 'get'},
    returns: {arg: 'suppliers', type: 'array', root:true}
  });

};
