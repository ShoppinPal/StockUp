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

  ReportModel.remoteMethod('getRows', {
    accepts: [
      {arg: 'id', type: 'number', required: true}
    ],
    http: {path: '/:id/rows', verb: 'get'},
    returns: {arg: 'rows', type: 'array', root:true}
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

  ReportModel.getRows = function(id, cb) {
    var currentUser = getCurrentUserModel(cb); // returns  immediately if no currentUser
    if (currentUser) {
      ReportModel.findById(id)
        .then(function (reportModelInstance) {
          log('reportModelInstance', reportModelInstance);
          reportModelInstance.stockOrderLineitemModels({}, function(err, data) {
            if (err) {
              console.error(err);
              cb(err);
            }
            log('data', data);
            cb(null, data);
          });
        });
    }
  };

  ReportModel.generateStockOrderReportForManager = function(id, cb) {
    var currentUser = getCurrentUserModel(cb); // returns  immediately if no currentUser
    if(currentUser) {
      // (1) generate a token for the worker to use on the currentUser's behalf
      currentUser.createAccessTokenAsync(1209600)// can't be empty ... time to live (in seconds) 1209600 is 2 weeks (default of loopback)
        .then(function(newAccessToken){
          // (2) fetch the report
          return ReportModel.findById(id) // chain the promise via a return statement so unexpected rejections/errors float up
            .then(function(reportModelInstance) {
              log('print object for reportModelInstance: ', reportModelInstance);
              // (3) fetch the store
              // TODO: is findOne buggy? does it return a result even when there are no matches?
              return ReportModel.app.models.StoreModel.findOne( // chain the promise via a return statement so unexpected rejections/errors float up
                {
                  where: {'api_id': reportModelInstance.outlet.id}, //assumption: there aren't any duplicate entries
                  include: 'storeConfigModel' // (4) also fetch the store-config
                }
              )
                .then(function(storeModelInstance){
                  log('print object for storeModelInstance: ', storeModelInstance);

                  // (5) extract domainPrefix from store-config's posUrl
                  var posUrl = storeModelInstance.storeConfigModel().posUrl;
                  var regexp = /^https?:\/\/(.*)\.vendhq\.com$/i;
                  var matches = posUrl.match(regexp);

                  // (6) Prepare payload for worker
                  var options = {
                    url: ReportModel.app.get('ironWorkersUrl'),
                    qs: {
                      'oauth': ReportModel.app.get('ironWorkersOauthToken'),
                      'code_name': ReportModel.app.get('stockOrderWorker'),
                      'priority': 1
                    },
                    json: {
                      tokenService: 'https://{DOMAIN_PREFIX}.vendhq.com/api/1.0/token', //TODO: fetch from global-config or config.*.json
                      clientId: ReportModel.app.get('vend').client_id,
                      clientSecret: ReportModel.app.get('vend').client_secret,
                      tokenType: 'Bearer',
                      accessToken: storeModelInstance.storeConfigModel().vendAccessToken,//'XN4ceup1M9Rp6Sf1AqeqarDjN9TMa06Mwr15K7lk',
                      refreshToken: storeModelInstance.storeConfigModel().vendRefreshToken,//'qSl8JF9fD2UMGAZfpsN2yr2d8XRNZgmQEKh7v5jp',
                      domainPrefix: matches[1], //'fermiyontest', // TODO: extract from storeConfigModelInstance.posUrl
                      loopbackServerUrl: process.env['site:baseUrl'],
                      //loopbackServerHost: 'mppulkit1.localtunnel.me',
                      //loopbackServerPort: '443',
                      loopbackAccessToken: newAccessToken, // let it be the full json object
                      reportId: id,
                      outletId: reportModelInstance.outlet.id,//'aea67e1a-b85c-11e2-a415-bc764e10976c',
                      supplierId: reportModelInstance.supplier.id//'c364c506-f8f4-11e3-a0f5-b8ca3a64f8f4'
                    }
                  };
                  log('options', JSON.stringify(options,null,2));
                  request.post(options)
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
                      //return Promise.reject(e.statusCode + ' ' + message); // TODO: throw unknown errors but reject well known errors?
                      cb(e.statusCode + ' ' + message);
                    })
                    .catch(function(e) {
                      console.error('report-model.js - generateStockOrderReportForManager - An unexpected error occurred: ', e);
                      //throw e; // TODO: throw unknown errors but reject well known errors?
                      //return Promise.reject(e);
                      cb(e);
                    });
                });
            });
        },
        function(error){
          cb(error);
        });
    }
  };

};
