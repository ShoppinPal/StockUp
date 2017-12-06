var Promise = require('bluebird');
var path = require('path');
var fileName = path.basename(__filename, '.js'); // gives the filename without the .js extension
var log = require('./../lib/debug-extension')('common:models:' + fileName);
var _ = require('underscore');

module.exports = function (UserModel) {

  // https://github.com/strongloop/loopback/issues/418
  // once a model is attached to the data source
  UserModel.on('dataSourceAttached', function (obj) {
    // wrap the whole model in Promise
    // but we need to avoid 'validate' method
    UserModel = Promise.promisifyAll(
      UserModel,
      {
        filter: function (name, func, target) {
          return !( name == 'validate');
        }
      }
    );

    UserModel.remoteMethod('profile', {
      accepts: [
        {arg: 'id', type: 'string', required: true}
      ],
      http: {path: '/:id/profile', verb: 'get'},
      returns: {arg: 'profileData', type: 'object'}
    });

    UserModel.profile = function (id, cb) {
      log('profile').info('Profile method was called');
      UserModel.findById(id, {
        include: ['roles', 'storeConfigModels']
      })
        .then(function (userModelInstance) {
          log('profile').debug('Found this user', userModelInstance);
          var roles = [];
          userModelInstance.roles().forEach(function (role) {
            roles.push(role.name);
          });
          var isAdmin = _.indexOf(roles, 'admin');
          var profileDataAsResponse = {};
          profileDataAsResponse = {
            username: userModelInstance.username,
            email: userModelInstance.email,
            roles: roles,
            userId: userModelInstance.id,
            storeConfigModelId: userModelInstance.storeConfigModels()[0].id
          };
          log('profile').debug('Fetching user profile', profileDataAsResponse);
          cb(null, profileDataAsResponse);
        })
        .catch(function (err) {
          log('profile').error('Unable to fetch profile', err);
          cb('Unable to fetch profile', err);
        });
    };


  });

};
