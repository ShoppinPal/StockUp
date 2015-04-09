'use strict';

var loopback = require('loopback');
var Promise = require('bluebird');
var request = require('request-promise');
var _ = require('underscore');

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

  ReportModel.remoteMethod('generateStockOrderReportForManager', {
    accepts: [
      {arg: 'id', type: 'number', required: true}
    ],
    http: {path: '/:id/generateStockOrderReportForManager', verb: 'get'},
    returns: {arg: 'reportModelInstance', type: 'object', root:true}
  });

  var getCurrentUserModel = function(cb) {
    var ctx = loopback.getCurrentContext();
    var currentUser = ctx && ctx.get('currentUser');
    if (currentUser) {
      console.log('inside ReportModel.getCurrentUserModel() - currentUser: ', currentUser.username);
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
      cb('401 - unauthorized - how did we end up here? should we manage ACL access to remote methods ourselves?');
    }
  };

  var successHandler = function(response) {
    if(_.isArray(response)) {
      console.log('response is an array');
    }
    else if(_.isObject(response)) {
      console.log('response is an object');
      return Promise.resolve(response);
    }
    else if(_.isString(response)) {
      console.log('response is a string');
      try{
        var responseObject = JSON.parse(response);
        //console.log(responseObject);
        return Promise.resolve(responseObject);
      }
      catch(error){
        console.error('caught an error: ', error);
        throw error;
      }
    }
    else {
      console.log(response);
    }
  };

  ReportModel.generateStockOrderReportForManager = function(id, cb) {
    var currentUser = getCurrentUserModel(cb); // returns  immediately if no currentUser

    if(currentUser) {
      // (1) fetch the reportModelInstance in question
      ReportModel.findOneAsync(
        //{filter:{where: {id: id}}}
        {id: 1}
      )
        .then(function(reportModelInstance) {
          console.log('print object for reportModelInstance: ', reportModelInstance);
          cb(null, reportModelInstance);

          // TODO: (2) get the config settings for calling iron.io
          // TODO: (3) generate a token for the worker to use on the currentUser's behalf
          // TODO: (4) trigger a rest call to iron.io w/ arguments from reportModelInstance
          var options = {
            url: ReportModel.app.get('ironWorkersUrl'),
            qs: {
              'oauth': ReportModel.app.get('ironWorkersOauthToken'),
              // TODO: deploy a worker in iron.io
              //       error: 'No code found to run for code.name = loopback.development'
              'code_name': ReportModel.app.get('stockOrderWorker'),
              'priority': 1
            },
            json: {
              'token': '<empty>',
              'outletId': reportModelInstance.outlet.id,
              'supplierId': reportModelInstance.supplier.id
            }
          };
          return request.post(options)
            .then(successHandler)
            .catch(function(e) {
              console.error('report-model.js - generateStockOrderReportForManager - An unexpected error occurred: ', e);
              throw e; // TODO: throw unknown errors but reject well known errors?
            });
        },
        function(error){
          cb(error);
        });
    }
  };
};
