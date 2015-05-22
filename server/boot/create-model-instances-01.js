'use strict';

// DEBUG=boot:create-model-instances slc run
var debug = require('debug')('boot:create-model-instances');

var Promise = require('bluebird');
var _ = require('underscore');

var createApplication = function(Application, model, callback){
  Application.findOrCreate( // do NOT create a new Application everytime, if persistence is available
    { // find
      where: {name: model.name}
    },
    model, // or Create
    callback
  );
};

module.exports = function(app) {
  var UserModel = app.models.UserModel;
  var Role = app.models.Role;
  var RoleMapping = app.models.RoleMapping;
  var TeamModel = app.models.TeamModel;

  var GlobalConfigModel = app.models.GlobalConfigModel;
  var StoreConfigModel = app.models.StoreConfigModel;
  var StoreModel = app.models.StoreModel;
  var SupplierModel = app.models.SupplierModel;
  var ReportModel = app.models.ReportModel;

  var Application = app.models.Application;

  var commentsIndex = 0;

  var findOrCreateRelatedModel = function (relatedModel, findUsing, createUsing){
    var RelatedModel = app.models[relatedModel._targetClass];

    return RelatedModel.findOne(findUsing)
      .then(function(modelInstance){
        debug('inside findOrCreateRelatedModel', 'modelInstance', modelInstance);
        if(modelInstance) {
          debug('inside findOrCreateRelatedModel', 'return as found');
          var created = false;
          return Promise.resolve([modelInstance, created]);
        }
        else {
          debug('inside findOrCreateRelatedModel', 'return as created');
          return relatedModel.create(createUsing)
            .then(function(modelInstance){
              var created = true;
              return Promise.resolve([modelInstance, created]);
            });
        }
      });
  };

  /**
   * NOTE: principal refers to RoleMapping
   *
   * @param aUser
   * @returns {*} a promise wrapped array ( [Role, RoleMapping] ) which can be can be spread() as needed
   */
  var findOrCreateRoleToAssignUser = function(aUser){
    debug('(' + (++commentsIndex) + ') ' + 'inside findOrCreateRoleToAssignUser');
    return Role.findOrCreate(
      {where: {name: aUser.seedWithRole||'retailer'}}, // find
      {name: aUser.seedWithRole||'retailer'} // or create
    )
      .spread(function(role, created) {
        (created) ? debug('(' + (++commentsIndex) + ') ' + 'created', role)
                  : debug('(' + (++commentsIndex) + ') ' + 'found', role);

        debug('(' + (++commentsIndex) + ') ' + 'will assign roles');
        //return role.principals.create({principalType: RoleMapping.USER, principalId: adminUser.id})
        return findOrCreateRelatedModel(
          role.principals,
          {where: {principalType: RoleMapping.USER, principalId: aUser.id}}, // find
          {principalType: RoleMapping.USER, principalId: aUser.id} // or create
        )
          .spread(function(principal, created) {
            (created) ? debug('(' + (++commentsIndex) + ') ' + 'created', 'RoleMapping', principal)
                      : debug('(' + (++commentsIndex) + ') ' + 'found', 'RoleMapping', principal);
            debug('(' + (++commentsIndex) + ') ' + aUser.username + ' now has role: ' + role.name);
            return Promise.resolve([role, principal]); // can spread() it as needed
          });
      });
  };

  var seed = null;
  try {
    seed = require('./seed.json');
  } catch (err) {
    debug('Please configure your data in `seed.json`.');
    debug('Copy `seed.json.template` to `seed.json` and replace the values with your own.');
  }

  // DEBUG=boot:create-model-instances node server/server.js
  var newAppModel = {
    owner: 'ShoppinPal',
    name: 'jsClient',
    description: 'JavaScript Client'/*,
    masterKey: 'aaa'*/
  };
  createApplication(Application, newAppModel, function(err, appModel) {
    if (err) {
      throw err;
    }
    debug('appModel', appModel);

    // sanity test - previous and next applications should both be the same
    createApplication(Application, newAppModel, function(err, appModel) {
      if (err) {
        throw err;
      }
      debug(appModel);

      var adminUser, retailUser, anotherRetailUser,
        adminUserRaw, retailUserRaw, anotherRetailUserRaw;
      if (seed) {
        debug('('+ (++commentsIndex) +') ' + 'initialize demo users based on seed.json');
        adminUserRaw = adminUser = seed.userModels[0];
        retailUserRaw = retailUser = seed.userModels[1];
        anotherRetailUserRaw = anotherRetailUser = seed.userModels[2];
      }
      else {
        debug('('+ (++commentsIndex) +') ' + 'initialize default demo users');
        adminUserRaw = adminUser = {seedWithRole: 'admin', realm: 'portal', username: 'admin@shoppinpal.com', email: 'admin@shoppinpal.com', password: 'admin'};
        retailUserRaw = retailUser = {seedWithRole: 'retailer', realm: 'portal', username: 'merchant1@shoppinpal.com', email: 'merchant1@shoppinpal.com', password: 'merchant1'};
        anotherRetailUserRaw = anotherRetailUser = {seedWithRole: 'retailer', realm: 'portal', username: 'merchant2@shoppinpal.com', email: 'merchant2@shoppinpal.com', password: 'merchant2'};
      }

      debug('('+ (++commentsIndex) +') ' + 'create users');
      UserModel.findOrCreate(
        {where: {username: adminUser.username}}, // find
        adminUser // or create
      )
        .spread(function(userInstance, created) {
          (created) ? debug('('+ (++commentsIndex) +') ' + 'created', userInstance)
                    : debug('('+ (++commentsIndex) +') ' + 'found', userInstance);
          adminUser = userInstance;

          return UserModel.findOrCreate(
            {where: {username: retailUser.username}}, // find
            retailUser // or create
          );
        })
        .spread(function(userInstance, created) {
          (created) ? debug('('+ (++commentsIndex) +') ' + 'created', userInstance)
                    : debug('('+ (++commentsIndex) +') ' + 'found', userInstance);
          retailUser = userInstance;

          return UserModel.findOrCreate(
            {where: {username: anotherRetailUser.username}}, // find
            anotherRetailUser // or create
          );
        })
        .spread(function(userInstance, created) {
          (created) ? debug('(' + (++commentsIndex) + ') ' + 'created', userInstance)
            : debug('(' + (++commentsIndex) + ') ' + 'found', userInstance);
          anotherRetailUser = userInstance;

          return Promise.resolve();
        })
        // TODO: create a user with teamAdmin role for patricias
        // TODO: add users in patricias team to the TeamModel for patricias
        // TODO: create a teamMember roleResolver
        // TODO: tie each teamMember to a specific store for patricias
        .then(function() {
          return findOrCreateRoleToAssignUser(adminUser);
        })
        .then(function() {
          return findOrCreateRoleToAssignUser(retailUser);
        })
        .then(function() {
          return findOrCreateRoleToAssignUser(anotherRetailUser);
        })
        .then(function() {
          debug('(' + (++commentsIndex) + ') ' +
            'setup a mock GlobalConfigModel(s) through UserModel ' +
            'to auto populate the foreign keys in userModelToGlobalConfigModelId correctly');

          return findOrCreateRelatedModel(
            adminUser.globalConfigModels,
            {where: {objectId: 1}}, // find
            {
              objectId: 1,
              vendClientId: app.get('vend').client_id,
              vendClientSecret: app.get('vend').client_secret,
              vendTokenService: 'https://{DOMAIN_PREFIX}.vendhq.com/api/1.0/token' //TODO: also populate from config.*.json
            } // or create
          )
            .spread(function(globalConfigModel, created) {
              (created) ? debug('(' + (++commentsIndex) + ') ' + 'created', 'GlobalConfigModel', globalConfigModel)
                        : debug('(' + (++commentsIndex) + ') ' + 'found', 'GlobalConfigModel', globalConfigModel);
              debug('(' + (++commentsIndex) + ') ' + 'created a globalConfigModel that belongs to ' + adminUser.username);
              return Promise.resolve();
            });
        }) // finished setting up a singleton for GlobalConfigModel
        .then(function() {
          debug('(' + (++commentsIndex) + ') ' + 'login with', {realm: retailUserRaw.realm, username: retailUserRaw.username, password: retailUserRaw.password});
          return UserModel.loginAsync({realm: retailUserRaw.realm, username: retailUserRaw.username, password: retailUserRaw.password})
            .tap(function(accessToken) { // create a default/empty report for merchant1
              debug('(' + (++commentsIndex) + ') ' + 'created', JSON.stringify(accessToken,null,2));
              debug('(' + (++commentsIndex) + ') ' + 'logged in w/ ' + retailUser.username + ' and token ' + accessToken.id);

              // TODO: populate the report too? somehow?
              return ReportModel.findOrCreate(
                {where:{id:1}}, // find
                {
                  id: 1,
                  userModelToReportModelId: retailUser.id, // explicitly setup the foreignKeys for related models
                  state: 'empty',
                  outlet: {
                    id: 'aea67e1a-b85c-11e2-a415-bc764e10976c',
                    name: 'OKC'
                  },
                  supplier: {
                    id: 'c364c506-f8f4-11e3-a0f5-b8ca3a64f8f4',
                    name: 'FFCC'
                  }
                } // create
              )
                .spread(function(reportModelInstance, created) {
                  (created) ? debug('(' + (++commentsIndex) + ') ' + 'created', reportModelInstance)
                            : debug('(' + (++commentsIndex) + ') ' + 'found', reportModelInstance);

                  /*ReportModel.findOne({}, function(err, reportModelInstance) {
                    if (err) {
                      return debug('%j', err);
                    }
                    debug('found a ReportModel entry: ' + JSON.stringify(reportModelInstance,null,2));
                  });*/
                  return Promise.resolve();
                });
            })
            .tap(function(accessToken) { // create store-config and store for merchant1
              debug('(' + (++commentsIndex) + ') ' + 'logged in w/ ' + retailUser.username + ' and token ' + accessToken.id);
              if(seed) {
                if (!seed.storeConfigModels) {
                  // filed: https://github.com/petkaantonov/bluebird/issues/580
                  seed.storeConfigModels = [];
                }
                // seed each store-config, one-by-one
                return Promise.map(
                  seed.storeConfigModels,
                  function(storeConfigSeedData){
                    var filteredStoreConfigSeedData = _.omit(storeConfigSeedData, 'storeModels');
                    filteredStoreConfigSeedData.userModelToStoreConfigModelId = retailUser.id;
                    return StoreConfigModel.findOrCreate(
                      {where:{name:filteredStoreConfigSeedData.name}}, // find
                      filteredStoreConfigSeedData // create
                    )
                      .spread(function(storeConfigModelInstance, created) {
                        (created) ? debug('('+ (++commentsIndex) +') ' + 'created', 'StoreConfigModel', storeConfigModelInstance)
                                  : debug('('+ (++commentsIndex) +') ' + 'found', 'StoreConfigModel', storeConfigModelInstance);

                        if (!storeConfigSeedData.storeModels) {
                          // filed: https://github.com/petkaantonov/bluebird/issues/580
                          storeConfigSeedData.storeModels = [];
                        }

                        // explicitly setup the foreignKey for related models
                        _.each(storeConfigSeedData.storeModels, function(storeModelSeedData){
                          storeModelSeedData.userModelToStoreModelId = retailUser.id;
                          storeModelSeedData.storeConfigModelToStoreModelId = storeConfigModelInstance.objectId;
                        });

                        // seed each STORE in a given store-config, one-by-one
                        return Promise.map(
                          storeConfigSeedData.storeModels,
                          function (storeSeedData) {
                            return StoreModel.findOrCreate(
                              {where:{name:storeSeedData.name}}, // find
                              storeSeedData // create
                            )
                              .spread(function(storeModelInstance, created) {
                                (created) ? debug('('+ (++commentsIndex) +') ' + 'created', 'StoreModel', storeModelInstance)
                                          : debug('('+ (++commentsIndex) +') ' + 'found', 'StoreModel', storeModelInstance);

                                if(storeSeedData.managerAccount) {
                                  debug('('+ (++commentsIndex) +') ' + 'add each store manager (storeSeedData.managerAccount) as a team member for StoreConfigModel');
                                  return UserModel.findOrCreate(
                                    {where: {username: storeSeedData.managerAccount.email}}, // find
                                    {
                                      realm: 'portal',
                                      username: storeSeedData.managerAccount.email,
                                      email: storeSeedData.managerAccount.email,
                                      password: storeSeedData.managerAccount.password
                                    } // or create
                                  )
                                    .spread(function(userInstance, created) {
                                      (created) ? debug('('+ (++commentsIndex) +') ' + 'created', 'UserModel', userInstance)
                                                : debug('('+ (++commentsIndex) +') ' + 'found', 'UserModel', userInstance);

                                      // TODO: 'set the userInstance as the StoreModel's owner'
                                      debug('('+ (++commentsIndex) +') ' + 'set the userInstance as the StoreModel\'s owner');

                                      return TeamModel.findOrCreate(
                                        {where:{ownerId: storeConfigModelInstance.userModelToStoreConfigModelId, memberId: userInstance.id}}, // find
                                        {ownerId: storeConfigModelInstance.userModelToStoreConfigModelId, memberId: userInstance.id} // create
                                      )
                                        .then(function(teamModel) {
                                          (created) ? debug('('+ (++commentsIndex) +') ' + 'created', 'TeamModel', teamModel)
                                                    : debug('('+ (++commentsIndex) +') ' + 'found', 'TeamModel', teamModel);

                                          return Promise.resolve();
                                        });
                                    });
                                }
                                else {
                                  debug('('+ (++commentsIndex) +') ' + 'no managerAccount is present, skipped seeding');
                                  return Promise.resolve(); // no managerAccount
                                }

                              });
                          },
                          {concurrency: 1}
                        )
                          .then(function () {
                            debug('finished seeding all STORES for', storeConfigModelInstance.name);

                            if (!storeConfigSeedData.supplierModels) {
                              // filed: https://github.com/petkaantonov/bluebird/issues/580
                              storeConfigSeedData.supplierModels = [];
                            }

                            // explicitly setup the foreignKey for related models
                            _.each(storeConfigSeedData.supplierModels, function(supplierModelSeedData){
                              supplierModelSeedData.userModelToStoreModelId = retailUser.id;
                              supplierModelSeedData.storeConfigModelToSupplierModelId = storeConfigModelInstance.objectId;
                            });

                            // seed each SUPPLIER in a given store-config, one-by-one
                            return Promise.map(
                              storeConfigSeedData.supplierModels, // can't handle undefined
                              function (supplierSeedData) {
                                return SupplierModel.findOrCreate(
                                  {where:{apiId:supplierSeedData.apiId}}, // find
                                  supplierSeedData // create
                                )
                                  .spread(function(supplierModelInstance, created) {
                                    (created) ? debug('('+ (++commentsIndex) +') ' + 'created', 'SupplierModel', supplierModelInstance)
                                              : debug('('+ (++commentsIndex) +') ' + 'found', 'SupplierModel', supplierModelInstance);
                                    return Promise.resolve();
                                  });
                              },
                              {concurrency: 1}
                            );
                          })
                          .then(function () {
                            debug('finished seeding all SUPPLIERS for', storeConfigModelInstance.name);
                            return Promise.resolve();
                          });
                      });
                      // TODO: catch block?
                  },
                  {concurrency: 1}
                )
                  .then(function () {
                    debug('finished seeding all store configs');
                    return Promise.resolve();
                  });
              }
            },
            function(err){
              return debug('%j', err);
            });
        })
        .catch(function(error){
          debug('error!');
          debug(error);
          //return debug('%j', error);
          //cb(error);
        });
    });

  });

};