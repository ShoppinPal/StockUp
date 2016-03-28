'use strict';

var path = require('path');
var fileName = path.basename(__filename, '.js'); // gives the filename without the .js extension
var log = require('debug')('boot:'+fileName);

var _ = require('lodash');

module.exports = function(app) {
  var Role = app.models.Role;

  Role.registerResolver('$masterKey', function(role, context, callback) {
    log('context.modelName: ', context.modelName);
    log('context.accessToken: ', context.accessToken);

    var masterKey = context.remotingContext.req.query['masterKey'];
    log('context.remotingContext.req.query[masterKey]: ',masterKey);

    function reject() {
      process.nextTick(function() {
        callback(null, false);
      });
    }

    var Application = app.models.Application;
    Application.find(
      {where: {masterKey: masterKey}},
      function(err, app) {
        if (err) {
          log('ERROR', err);
          console.error(err);
          return reject();
          //throw err;
        }
        log(app);
        callback(null, (masterKey && app && app.length===1));
      });

  });

  Role.registerResolver('teamMember', function(role, context, cb) {
    function reject() {
      process.nextTick(function() {
        cb(null, false);
      });
    }

    // do not allow anonymous users
    var currentUserId = context.accessToken.userId;
    if (!currentUserId) {
      log('do not allow anonymous users');
      return reject();
    }

    log('Role resolver for `teamMember`', '\n',
        ' - evaluate ' + context.model.definition.name + ' with id: ' + context.modelId, '\n',
        ' for currentUserId: ' + currentUserId);
    context.model.findById(context.modelId, function(err, modelInstance) {
      if (err) {
        log('err', err);
        return reject();
      }
      else if(!modelInstance) {
        log('no model instance found');
        return reject();
      }
      else {
        var TeamModel = app.models.TeamModel;
        var RoleMapping = app.models.RoleMapping;
        log('check if currentUserId:', currentUserId, '\n',
          'is in the team table for the given model\'s userId:', modelInstance.userId);
        TeamModel.count({
          ownerId: modelInstance.userId,  // only works for StoreConfigModel and SupplierModel which had its userId set to that of primary admin's ID at time of seeding
          memberId: currentUserId
        }, function(err, count) {
          if (err) {
            console.log(err);
            return cb(null, false);
          }

          Role.findOne({
            where: {name: 'manager'}
          }, function(err, roleInstance) {
            if (err) {
              console.log(err);
              return cb(null, false);
            }
            log('roleInstance:', roleInstance);

            RoleMapping.find({
              where: {
                // https://github.com/strongloop/loopback-connector-mongodb/issues/128
                // doesn't work because principalId is already stored as a string in mongo
                // and changing the Model via boot script now:
                // > RoleMapping.defineProperty('principalId', {type: ObjectID});
                // won't change how data is already stored!
                //principalId: currentUserId,
                roleId: roleInstance.id
              }
            }, function(err, roleMappingInstances) {
              if (err) {
                console.log(err);
                return cb(null, false);
              }

              //log('roleMappingInstances:', roleMappingInstances);
              roleMappingInstances = _.filter(roleMappingInstances, function(roleMappingInstance){
                return roleMappingInstance.principalId == currentUserId; // strict comparison with === fails
              });
              //log('roleMappingInstances:', roleMappingInstances);

              log('is a team member? count > 0', (count > 0));
              log('is a manager? roleMappingInstances.length > 0', (roleMappingInstances.length > 0));
              cb(null, (count > 0 && roleMappingInstances.length > 0) ); // true = is a team member
            });
          });

        });
      }
    });
  });

  /*Role.registerResolver('$manager', function(role, context, callback) {
      });

  Role.registerResolver('$warehouse', function(role, context, callback) {
              });

  Role.registerResolver('$receiver', function(role, context, callback) {
  });*/

};
