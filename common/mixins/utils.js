'use strict';

var loopback = require('loopback');
var Promise = require('bluebird');

var path = require('path');
var fileName = path.basename(__filename, '.js'); // gives the filename without the .js extension
const logger = require('sp-json-logger');

module.exports = function(Model, options) {

  Model.getCurrentUserModel = function(cb) {
    var ctx = loopback.getCurrentContext();
    var currentUser = ctx && ctx.get('currentUser');
    if (currentUser) {
      //log.trace('inside ' + Model.definition.name + '.getCurrentUserModel() - currentUser: ', currentUser.username);
      logger.trace({log: {message: `inside ${Model.definition.name}.getCurrentUserModel() - currentUser: ${currentUser.username}` }});
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

};