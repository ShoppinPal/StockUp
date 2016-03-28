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

  Role.registerResolver('teamAdmin', function(role, context, cb) {
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

    log('Role resolver for `teamAdmin`', '\n',
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
          ownerId: modelInstance.userId, // only works for StoreConfigModel and SupplierModel which had its userId set to that of primary admin's ID at time of seeding
          memberId: currentUserId
        }, function(err, memberCount) {
          if (err) {
            console.log(err);
            return cb(null, false);
          }

          Role.findOne({
            where: {name: 'admin'}
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

              // TODO: how to spot the primary admin?
              // for a ReportModel the userModelToReportModelId points to a manager so we'd have to check:
              /*TeamModel.count({
                 memberId: reportModel.userModelToReportModelId
                 //memberId: storeModel.userModelToStoreModelId
                 //memberId: storeConfigModel.userId
                 ownerId: currentUserId,
               })*/
              // this is too messy and tightly coupled per model :(
              // > maybe not resuse admin role for otherAdmins? instead create a new one for them called `secondaryAdmin`?
              // and then leave the acls for admin and secondaryAdmin both in place?
              // that would really suck cause in multi-tenancy ... shoppinpal-admin will still see patricias-admin's data then!
              // > run a migration like boot script to find and add a storeConfigModel's userId to all its reports, rows, stores etc.
              // with them keeping the same field name "userId" so role resolved code remains simpler and userId always points back at primary admin?
              // >> maybe even use such a migrationScript to add "primaryAdmin" as the standardized field name everywhere instead?
              // > how about a migration script that looks at existing storeConfigModel's userId and wires orgId everywhere?
              var filter = {};
              var isPrimaryAdmin = false;
              if (context.model.definition.name === 'StoreConfigModel' ||
                  context.model.definition.name === 'StockOrderLineitemModel')
              {
                if (modelInstance.userId == currentUserId){
                  isPrimaryAdmin = true;
                }
                log('is a team member? count > 0', (memberCount > 0));
                log('is a admin? roleMappingInstances.length > 0', (roleMappingInstances.length > 0));
                log('is a primary admin?', (isPrimaryAdmin));
                cb(null, (isPrimaryAdmin || (memberCount > 0 && roleMappingInstances.length > 0)) ); // true = is a team admin
              }
              else if (context.model.definition.name === 'ReportModel') {
                filter.where = {
                  ownerId: currentUserId,
                  memberId: modelInstance.userModelToReportModelId
                }; // should have a count of 1 because an entry will be present in team for primary admin and the manager who created the report
                TeamModel.count(filter.where, function(err, adminCount) {
                  if (err) {
                    console.log(err);
                    return cb(null, false);
                  }
                  isPrimaryAdmin = (adminCount > 0);
                  log('is a team member? count > 0', (memberCount > 0));
                  log('is a admin? roleMappingInstances.length > 0', (roleMappingInstances.length > 0));
                  log('is a primary admin?', isPrimaryAdmin);
                  cb(null, (isPrimaryAdmin || (memberCount > 0 && roleMappingInstances.length > 0)) ); // true = is a team admin
                });
              }

            });
          });

        });
      }
    });
  });

};
