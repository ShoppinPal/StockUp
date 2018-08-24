'use strict';
var _ = require('underscore');
var logger = require('sp-json-logger');

module.exports = function (app) {

  var Role = app.models.Role;

  /*
   * Dynamic role resolvers for manufacturers, retailers, small_wholesalers, wholesalers,
   * distributors and consumers
   */
  var roles = ['storeManager'];
  _.each(roles, function (eachRole) {
    Role.registerResolver(eachRole, function (role, context, cb) {
      function reject(err) {
        if (err) {
          return cb(err);
        }
        cb(null, false);
      }

      if (context.modelName !== 'OrgModel') {
        // return error if target model is not OrgModel
        return reject();
      }
      var currentUserId = context.accessToken.userId;
      var currentOrg = context.modelId;
      if (!currentUserId) {
        logger.debug({log: {message: 'No user Id present, will reject request'}});
        // Do not allow unauthenticated users to proceed
        return reject();
      }
      if (!currentOrg) {
        logger.debug({log: {message: 'No org Id present, will reject request'}});
        return reject();
      }
      else {
        app.models.UserModel.findById(currentUserId, {
          include: {
            relation: 'roles',
            scope: {
              fields: ['name'] // only include the role name and id
            }
          }
        })
          .then(function (userModelInstance) {
            if (!userModelInstance.orgModelId) {
              logger.debug({log: {message: 'User does not belong to organisation, will reject'}});
              return reject();
            }
            var isValidUser = _.findWhere(userModelInstance.roles(), {name: eachRole});
            if (!_.isEqual(userModelInstance.orgModelId.toString(), currentOrg.toString())) {
              // return if false
              logger.debug({log: {message: 'User does not belong to organisation, will reject'}});
              return reject();
            }
            if (!isValidUser) {
              logger.debug({log: {message: 'User is not storeManager, will reject request'}});
              return reject();
            }
            else {
              // log.debug('User is accessing as ' + eachRole.name);
              return cb(null, true);
            }
          })
          .catch(function (error) {
            logger.error({log: {err: error}});
            cb(error);
          });
      }
    });
  });

};
