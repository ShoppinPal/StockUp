'use strict';

var loopback = require('loopback');
var Promise = require('bluebird');
var request = require('request-promise');
var _ = require('underscore');

var path = require('path');
var fileName = path.basename(__filename, '.js'); // gives the filename without the .js extension
var log = require('debug')('common:models:'+fileName);

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
      log('inside ReportModel.getCurrentUserModel() - currentUser: ', currentUser.username);
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

  var ClientError = function ClientError(e) {
    return e.statusCode >= 400 && e.statusCode < 500;
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
      ReportModel.findByIdAsync(
        //{filter:{where: {id: id}}}
        //{id: id}
        id
      )
        .then(function(reportModelInstance) {
          log('print object for reportModelInstance: ', reportModelInstance);

          // TODO: (2) get the config settings for calling iron.io
          log('ReportModel.app.get(\'site:baseUrl\')', ReportModel.app.get('site:baseUrl'));
          log('process.env[\'site:baseUrl\']', process.env['site:baseUrl']);

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
          log('options', JSON.stringify(options,null,2));
          return request.post(options)
            .then(successHandler)
            .then(function(data){
              log('data', JSON.stringify(data,null,2));
              cb(null, data);
            })
            .catch(ClientError, function(e) {
              var message = e.response.body;
              if(_.isObject(message)) {
                message = JSON.stringify(message,null,2);
              }
              console.error('A ClientError happened: \n'
                  + e.statusCode + ' ' + message + '\n'
                  /*+ JSON.stringify(e.response.headers,null,2)
                  + JSON.stringify(e,null,2)*/
              );
              // TODO: add retry logic?
              return Promise.reject(e.statusCode + ' ' + message); // TODO: throw unknown errors but reject well known errors?
            })
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
