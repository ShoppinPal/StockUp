'use strict';

var loopback = require('loopback');
var Promise = require('bluebird');

var path = require('path');
var fileName = path.basename(__filename, '.js'); // gives the filename without the .js extension
var log = require('debug')('common:models:'+fileName);

module.exports = function(Model, options) {

  Model.getCurrentUserModel = function(cb) {
    var ctx = loopback.getCurrentContext();
    var currentUser = ctx && ctx.get('currentUser');
    if (currentUser) {
      log('inside ' + Model.definition.name + '.getCurrentUserModel() - currentUser: ', currentUser.username);
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

  Model.getAllRelevantModelInstancesForReportModel = function(id){
    /// TODO: once the loopback framework starts supporting the INCLUDE filter with FINDBYID() ... use it!
    return Model.findById(id) // chain the promise via a return statement so unexpected rejections/errors float up
      .then(function(reportModelInstance) {
        log('print object for reportModelInstance: ', reportModelInstance);
        // TODO: is findOne buggy? does it return a result even when there are no matches?
        return Model.app.models.StoreModel.findOne( // chain the promise via a return statement so unexpected rejections/errors float up
          {
            where: {'api_id': reportModelInstance.outlet.id}, //assumption: there aren't any duplicate entries
            include: 'storeConfigModel' // (4) also fetch the store-config
          }
        )
          .then(function(storeModelInstance) {
            log('print object for storeModelInstance: ', storeModelInstance);
            var storeConfigInstance = storeModelInstance.storeConfigModel();
            log('print object for storeConfigInstance: ', storeConfigInstance);
            return Promise.resolve([reportModelInstance, storeModelInstance, storeConfigInstance]);
          });
      });
  };

};