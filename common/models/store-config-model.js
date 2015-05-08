var loopback = require('loopback');
var Promise = require('bluebird');

var path = require('path');
var fileName = path.basename(__filename, '.js'); // gives the filename without the .js extension
var log = require('debug')('common:models:'+fileName);

module.exports = function(StoreConfigModel) {

  // https://github.com/strongloop/loopback/issues/418
  // once a model is attached to the data source
  StoreConfigModel.on('dataSourceAttached', function(obj){
    // wrap the whole model in Promise
    // but we need to avoid 'validate' method
    StoreConfigModel = Promise.promisifyAll(
      StoreConfigModel,
      {
        filter: function(name, func, target){
          return !( name == 'validate');
        }
      }
    );
  });

  /*StoreConfigModel.beforeValidate = function(next, modelInstance) {
    console.log('inside StoreConfigModel.beforeValidate()');
    console.log(modelInstance);
    modelInstance.transactionFee = 0.1;
    console.log(modelInstance);
    next();
  };*/

  var getCurrentUserModel = function(cb) {
    var ctx = loopback.getCurrentContext();
    var currentUser = ctx && ctx.get('currentUser');
    if (currentUser) {
      console.log('inside StoreConfigModel.getCurrentUserModel() - currentUser: ', currentUser.username);
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

  StoreConfigModel.getVendRegisters = function(id, cb) {
    var currentUser = getCurrentUserModel(cb); // returns  immediately if no currentUser

    if(currentUser) {
      //cb(null);

      // Is GlobalConfigModel already promise'fied? YES!!!
      /*var GlobalConfigModel = StoreConfigModel.app.models.GlobalConfigModel;
      return GlobalConfigModel.findOne({})
        .then(function(globalConfig) {
          console.log('globalConfig', globalConfig);
          cb(null);
        });*/

      var oauthVendUtil = require('./../../common/utils/vend')({
        'GlobalConfigModel': StoreConfigModel.app.models.GlobalConfigModel,
        'StoreConfigModel': StoreConfigModel,
        'currentUser': currentUser
      });
      oauthVendUtil.getVendRegisters(id)
        .then(function(registers){
          cb(null, registers);
        },
        function(error){
          cb(error);
        });
    }
  };

  StoreConfigModel.getVendOutlets = function(id, cb) {
    var currentUser = getCurrentUserModel(cb); // returns immediately if no currentUser

    if(currentUser) {
      var oauthVendUtil = require('./../../common/utils/vend')({
        'GlobalConfigModel': StoreConfigModel.app.models.GlobalConfigModel,
        'StoreConfigModel': StoreConfigModel,
        'currentUser': currentUser
      });
      // TODO: use it for something real!
      oauthVendUtil.getVendOutlets(id)
        .then(function(outlets){
          cb(null, outlets);
        },
        function(error){
          cb(error);
        });
    }
  };

  StoreConfigModel.getVendTaxes = function(id, cb) {
    var currentUser = getCurrentUserModel(cb); // returns immediately if no currentUser

    if(currentUser) {
      var oauthVendUtil = require('./../../common/utils/vend')({
        'GlobalConfigModel': StoreConfigModel.app.models.GlobalConfigModel,
        'StoreConfigModel': StoreConfigModel,
        'currentUser': currentUser
      });
      // TODO: use it for something real!
      oauthVendUtil.getVendTaxes(id)
        .then(function(taxes){
          cb(null, taxes);
        },
        function(error){
          cb(error);
        });
    }
  };

  StoreConfigModel.getVendPaymentTypes = function(id, cb) {
    var currentUser = getCurrentUserModel(cb); // returns immediately if no currentUser

    if(currentUser) {
      var oauthVendUtil = require('./../../common/utils/vend')({
        'GlobalConfigModel': StoreConfigModel.app.models.GlobalConfigModel,
        'StoreConfigModel': StoreConfigModel,
        'currentUser': currentUser
      });
      // TODO: use it for something real!
      oauthVendUtil.getVendPaymentTypes(id)
        .then(function(paymentTypes){
          cb(null, paymentTypes);
        },
        function(error){
          cb(error);
        });
    }
  };

  StoreConfigModel.afterRemote('getVendAccessToken', function(ctx, remoteMethodResponse, next) {
    console.log('inside afterRemote:getVendAccessToken');
    //console.log('ctx.result.redirectUrl: ' + ctx.result.redirectUrl);
    console.log('remoteMethodResponse.redirectUrl: ' + remoteMethodResponse.redirectUrl);
    ctx.res.redirect(301, remoteMethodResponse.redirectUrl);
  });

  StoreConfigModel.getVendAccessToken = function(code, domainPrefix, state, cb) {
    var currentUser = getCurrentUserModel(cb); // returns immediately if no currentUser

    var oauthVendUtil = require('./../../common/utils/vend')({
      'StoreConfigModel': StoreConfigModel,
      'currentUser': currentUser
    });
    console.log('inside getVendAccessToken(), args:' +
      '\n code: ' + code +
      '\n domainPrefix' + domainPrefix +
      '\n state ' + state + // user's authN session token
      //'\n baseUrl ' + StoreConfigModel.app.get('site').baseUrl +
      '\n restApiRoot ' + StoreConfigModel.app.get('restApiRoot') +
      '\n vend ' + StoreConfigModel.app.get('vend'));

    // NOTE: You can get a reference to the app INSIDE remote methods, remote hooks,
    //       and model hooks because those are triggered after the application finishes loading.
    //       http://docs.strongloop.com/display/public/LB/Working+with+LoopBack+objects#WorkingwithLoopBackobjects-Fromamodelscript

    oauthVendUtil.token(
      code, domainPrefix, state,
      //StoreConfigModel.app.get('site').baseUrl,
      StoreConfigModel.app.get('restApiRoot'),
      StoreConfigModel.app.get('vend')
    )
      .then(function(redirectUrl){
        console.log('redirectUrl: ' + redirectUrl);
        cb(null, redirectUrl);
      },
      function(error){
        cb(error);
      });
  };

  // TODO: Create a StoreConfigModel for UserModel (identify the owner via token)
  //       if this is exposed via remote method then there is no need to validate token as ACLs would have done it
  //       also the calling remote method wrapper can provide the UserModel instance
  //       so that related models can have it as their $owner
  StoreConfigModel.remoteMethod('getVendRegisters', {
    accepts: [
      {arg: 'id', type: 'string', required: true}
    ],
    //http: {path: '/:id/:pos/:entity', verb: 'get'}
    http: {path: '/:id/vend/registers', verb: 'get'},
    returns: {arg: 'registers', type: 'array', root:true}
  });

  StoreConfigModel.remoteMethod('getVendOutlets', {
    accepts: [
      {arg: 'id', type: 'string', required: true}
    ],
    http: {path: '/:id/vend/outlets', verb: 'get'},
    returns: {arg: 'outlets', type: 'array', root:true}
  });

  StoreConfigModel.remoteMethod('getVendTaxes', {
    accepts: [
      {arg: 'id', type: 'string', required: true}
    ],
    http: {path: '/:id/vend/taxes', verb: 'get'},
    returns: {arg: 'taxes', type: 'array', root:true}
  });

  StoreConfigModel.remoteMethod('getVendPaymentTypes', {
    accepts: [
      {arg: 'id', type: 'string', required: true}
    ],
    http: {path: '/:id/vend/payment_types', verb: 'get'},
    returns: {arg: 'payment_types', type: 'array', root:true}
  });

  StoreConfigModel.remoteMethod('getVendAccessToken', {
    accepts: [
      {arg: 'code', type: 'string', required: true},
      {arg: 'domain_prefix', type: 'string', required: true},
      {arg: 'state', type: 'string', required: true}
    ],
    http: {path: '/token/vend', verb: 'get'},
    returns: {arg: 'redirectUrl', type: 'string'}
  });

};
