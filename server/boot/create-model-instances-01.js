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
        //debug('inside findOrCreateRelatedModel', 'modelInstance', modelInstance);
        if(modelInstance) {
          //debug('inside findOrCreateRelatedModel', 'return as found');
          var created = false;
          return Promise.resolve([modelInstance, created]);
        }
        else {
          //debug('inside findOrCreateRelatedModel', 'return as created');
          return relatedModel.create(createUsing)
            .then(function(modelInstance){
              var created = true;
              return Promise.resolve([modelInstance, created]);
            });
        }
      });
  };

  var setupUser = function(rawUser) {
    return UserModel.findOrCreate(
      {where: {username: rawUser.username}}, // find
      rawUser // or create
    )
      .spread(function(userInstance, created) {
        (created) ? debug('('+ (++commentsIndex) +') ' + 'created', 'UserModel', userInstance)
                  : debug('('+ (++commentsIndex) +') ' + 'found', 'UserModel', userInstance);

        return findOrCreateRoleToAssignUser(userInstance)
          .spread(function(/*role, principal*/){
            return Promise.resolve(userInstance);
          });
      });
  };

  /**
   * NOTE: principal refers to RoleMapping
   *
   * @param aUserModel
   * @returns {*} a promise wrapped array ( [Role, RoleMapping] ) which can be can be spread() as needed
   */
  var findOrCreateRoleToAssignUser = function(aUserModel){
    //debug('(' + (++commentsIndex) + ') ' + 'inside findOrCreateRoleToAssignUser');
    return Role.findOrCreate(
      {where: {name: aUserModel.seedWithRole||'retailer'}}, // find
      {name: aUserModel.seedWithRole||'retailer'} // or create
    )
      .spread(function(role, created) {
        (created) ? debug('(' + (++commentsIndex) + ') ' + 'created', 'Role', role)
                  : debug('(' + (++commentsIndex) + ') ' + 'found', 'Role', role);

        debug('(' + (++commentsIndex) + ') ' + 'will assign roles');
        //return role.principals.create({principalType: RoleMapping.USER, principalId: adminUser.id})
        return findOrCreateRelatedModel(
          role.principals,
          {where: {principalType: RoleMapping.USER, principalId: aUserModel.id}}, // find
          {principalType: RoleMapping.USER, principalId: aUserModel.id} // or create
        )
          .spread(function(principal, created) {
            (created) ? debug('(' + (++commentsIndex) + ') ' + 'created', 'RoleMapping', principal)
                      : debug('(' + (++commentsIndex) + ') ' + 'found', 'RoleMapping', principal);
            debug('(' + (++commentsIndex) + ') ' + aUserModel.username + ' now has role: ' + role.name);
            return Promise.resolve([role, principal]); // can spread() it as needed
          });
      });
  };

  /**
   *
   * @param rawUser
   * @returns {*} an Promise that resolves to an AccessToken value
   */
  var userLogin = function(rawUser){
    return UserModel.loginAsync({realm: rawUser.realm, username: rawUser.username, password: rawUser.password})
      .tap(function(accessToken) { // create a default/empty report for merchant1
        debug('(' + (++commentsIndex) + ') ' + 'created', 'AccessToken', JSON.stringify(accessToken, null, 2));
        debug('(' + (++commentsIndex) + ') ' + 'logged in w/ ' + rawUser.username + ' and token ' + accessToken.id);
      });
  };

  var request = require('supertest-as-promised');
  function json(verb, url) {
    return request(app)[verb](url)
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/);
  }

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
      try {
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
        return Promise.resolve() // this is a no-op but the code looks just a tad prettier this way
          .then(function() {
            return setupUser(adminUser)
              .then(function(userInstance) {
                adminUser = userInstance;
                return Promise.resolve();
              });
          }) // finished setting up adminUser
          .then(function() {
            return setupUser(retailUser)
              .then(function(userInstance) {
                retailUser = userInstance;
                return Promise.resolve();
              });
          }) // finished setting up retailUser
          .then(function() {
            return setupUser(anotherRetailUser)
              .then(function(userInstance) {
                anotherRetailUser = userInstance;
                return Promise.resolve();
              });
          }) // finished setting up anotherRetailUser
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
            return userLogin(retailUserRaw);
          }) // login and spit out the accessToken for retailUser so we may use it for manual testing
          .tap(function(retailUserAccessToken) {
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
                (created) ? debug('(' + (++commentsIndex) + ') ' + 'created', 'ReportModel', reportModelInstance)
                          : debug('(' + (++commentsIndex) + ') ' + 'found', 'ReportModel', reportModelInstance);

                /*ReportModel.findOne({}, function(err, reportModelInstance) {
                  if (err) {
                    return debug('%j', err);
                  }
                  debug('found a ReportModel entry: ' + JSON.stringify(reportModelInstance,null,2));
                });*/
                return Promise.resolve();
              });
          }) // created a demo ReportModel for retailUser
          .tap(function(retailUserAccessToken) { // create store-config and store for merchant1
            if(seed) {
              if (!seed.storeConfigModels) {
                // filed: https://github.com/petkaantonov/bluebird/issues/580
                seed.storeConfigModels = [];
              }
              debug('('+ (++commentsIndex) +')', 'seed each store-config, one-by-one');
              return Promise.map(
                seed.storeConfigModels,
                function(storeConfigSeedData){
                  var filteredStoreConfigSeedData = _.omit(storeConfigSeedData, 'storeModels');

                  var teamAdminRaw = storeConfigSeedData.teamAdmin || retailUserRaw;
                  return setupUser(teamAdminRaw)
                    .then(function(userInstance) {
                      debug('('+ (++commentsIndex) +')', 'created and assigned the teamAdmin:', userInstance.username);
                      filteredStoreConfigSeedData.userId = userInstance.id;
                      return Promise.resolve();
                    })
                    .then(function() {
                      debug('('+ (++commentsIndex) +')', 'seed a StoreConfigModel');
                      return StoreConfigModel.findOrCreate(
                        {where:{name:filteredStoreConfigSeedData.name}}, // find
                        filteredStoreConfigSeedData // create
                      )
                        .spread(function(storeConfigModelInstance, created) {
                          (created) ? debug('('+ (++commentsIndex) +')', 'created', 'StoreConfigModel', {objectId: storeConfigModelInstance.objectId, name: storeConfigModelInstance.name})
                                    : debug('('+ (++commentsIndex) +')', 'found', 'StoreConfigModel', {objectId: storeConfigModelInstance.objectId, name: storeConfigModelInstance.name});

                          if (!storeConfigSeedData.storeModels) {
                            // filed: https://github.com/petkaantonov/bluebird/issues/580
                            storeConfigSeedData.storeModels = [];
                          }

                          debug('('+ (++commentsIndex) +')', 'explicitly attach the foreignKey for related models');
                          _.each(storeConfigSeedData.storeModels, function(storeModelSeedData){
                            //storeModelSeedData.userModelToStoreModelId = retailUser.id; // gets taken care of later, when manager is created
                            storeModelSeedData.storeConfigModelToStoreModelId = storeConfigModelInstance.objectId;
                          });

                          debug('('+ (++commentsIndex) +')', 'seed each STORE in a given store-config, one-by-one');
                          return Promise.map(
                            storeConfigSeedData.storeModels,
                            function (storeSeedData) {
                              return Promise.resolve()
                                .then(function(){
                                  if (storeSeedData.managerAccount) {
                                    return setupUser({
                                      seedWithRole: 'manager',
                                      realm: 'portal',
                                      username: storeSeedData.managerAccount.email,
                                      email: storeSeedData.managerAccount.email,
                                      password: storeSeedData.managerAccount.password
                                    })
                                      .tap(function (userInstance) {
                                        debug('(' + (++commentsIndex) + ')', 'add store manager as a team member for', storeSeedData.name);
                                        return TeamModel.findOrCreate(
                                          {where: {ownerId: storeConfigModelInstance.userId, memberId: userInstance.id}}, // find
                                          {ownerId: storeConfigModelInstance.userId, memberId: userInstance.id} // create
                                        )
                                          .spread(function (teamModel, created) {
                                            (created) ? debug('(' + (++commentsIndex) + ') ' + 'created', 'TeamModel', teamModel)
                                              : debug('(' + (++commentsIndex) + ') ' + 'found', 'TeamModel', teamModel);

                                            debug('(' + (++commentsIndex) + ')',
                                              'Let\'s test a team member\'s access to StoreConfigModel',
                                                'GET /api/StoreConfigModels/' + storeConfigModelInstance.objectId);
                                            return userLogin({
                                              realm: 'portal',
                                              username: storeSeedData.managerAccount.email,
                                              password: storeSeedData.managerAccount.password
                                            })
                                              .then(function (teamMemberAccessToken) {
                                                return json('get', '/api/StoreConfigModels/' + storeConfigModelInstance.objectId)
                                                  //return json('get', '/api/StoreConfigModels/1')
                                                  .set('Authorization', teamMemberAccessToken.id)
                                                  .then(function (res) {
                                                    debug('(' + (++commentsIndex) + ')',
                                                      'TEST', 'found', 'StoreConfigModel',
                                                      {objectId: res.body.objectId, name: res.body.name}
                                                    );
                                                    return Promise.resolve();
                                                  });
                                              });
                                          });
                                      })
                                      .then(function (userInstance) {
                                        debug('(' + (++commentsIndex) + ') ',
                                            'set ' + storeSeedData.managerAccount.email +
                                            ' as the owner of ' + storeSeedData.name);
                                        storeSeedData.userModelToStoreModelId = userInstance.id;
                                        return Promise.resolve();
                                      });
                                  }
                                  else {
                                    storeSeedData.userModelToStoreModelId = retailUser.id;
                                    return Promise.resolve();
                                  }
                                }) // set up the manager's account
                                .then(function(){
                                  debug('('+ (++commentsIndex) +') ', 'seed the store: '+ storeSeedData.name);
                                  return StoreModel.findOrCreate(
                                    {where:{name:storeSeedData.name}}, // find
                                    storeSeedData // create
                                  )
                                    .spread(function(storeModelInstance, created) {
                                      (created) ? debug('('+ (++commentsIndex) +')', 'created', 'StoreModel', storeModelInstance)
                                                : debug('('+ (++commentsIndex) +')', 'found', 'StoreModel', storeModelInstance);

                                      return Promise.resolve();
                                    });
                                }); // seeded the store
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
                                supplierModelSeedData.userId = filteredStoreConfigSeedData.userId;
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
                    });
                },
                {concurrency: 1}
              )
                .then(function () {
                  debug('finished seeding all store configs');
                  return Promise.resolve();
                });
            }
          })
          .catch(function(error){
            debug('error!');
            debug(error);
            //return debug('%j', error);
            //cb(error);
          });
      } // end of try-block
      catch (e) {
        if(e.stack) {
          console.trace(e.stack);
        }
        else {
          console.trace(e);
        }
        throw e;
      } // end of catch-block
    });

  });

};