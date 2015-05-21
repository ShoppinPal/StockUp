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

  var GlobalConfigModel = app.models.GlobalConfigModel;
  var StoreConfigModel = app.models.StoreConfigModel;
  var StoreModel = app.models.StoreModel;
  var SupplierModel = app.models.SupplierModel;
  var ReportModel = app.models.ReportModel;

  var Application = app.models.Application;

  var seed = null;
  try {
    seed = require('./seed.json');
  } catch (err) {
    debug(
      'Please configure your data in `seed.json`.');
    debug(
      'Copy `seed.json.template` to `seed.json` and replace the values with your own.'
    );
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

      var adminUser = {realm: 'portal', username: 'admin@shoppinpal.com', email: 'admin@shoppinpal.com', password: 'admin'};
      var retailUser = {realm: 'portal', username: 'merchant1@shoppinpal.com', email: 'merchant1@shoppinpal.com', password: 'merchant1'};
      var anotherRetailUser = {realm: 'portal', username: 'merchant2@shoppinpal.com', email: 'merchant2@shoppinpal.com', password: 'merchant2'};

      // (1) create users
      UserModel.findOrCreate(
        {where: {username: adminUser.username}}, // find
        adminUser // or create
      )
        .then(function(resolvedData){
          debug(resolvedData);
          // API changes: 2015-01-07, Version 2.13.0
          // add a flag to callback of findOrCreate to indicate find or create (Clark Wang)
          adminUser = resolvedData[0];
          debug(adminUser);

          return UserModel.findOrCreate(
            {where: {username: retailUser.username}}, // find
            retailUser // or create
          );
        })
        .then(function(resolvedData){
          debug(resolvedData);
          retailUser = resolvedData[0];
          debug(retailUser);

          return UserModel.findOrCreate(
            {where: {username: anotherRetailUser.username}}, // find
            anotherRetailUser // or create
          );
        })
        .then(function(resolvedData){
          debug(resolvedData);
          anotherRetailUser = resolvedData[0];
          debug(anotherRetailUser);

          //create the admin role
          Role.create({name: 'admin'},
            function(err, role) {
              if (err) {
                return debug(err);
              }
              debug(role);
              //make admin an admin
              role.principals.create({
                  principalType: RoleMapping.USER,
                  principalId: adminUser.id
                },
                function(err, principal) {
                  if (err) {
                    return debug(err);
                  }
                  debug(principal);
                  debug(adminUser.username + ' now has role: ' + role.name);

                  // create mock GlobalConfigModel(s) through UserModel to auto populate
                  // the foreign keys in userModelToGlobalConfigModelId correctly
                  adminUser.globalConfigModels.create(
                    {
                      objectId: 1,
                      vendClientId: app.get('vend:client_id'),
                      vendClientSecret: app.get('vend:client_secret'),
                      vendTokenService: 'https://{DOMAIN_PREFIX}.vendhq.com/api/1.0/token' //TODO: also populate from config.*.json
                    },
                    function(err, globalConfigModel) {
                      if (err) {
                        //return debug('%j', err); //%j - JSON. Replaced with the string '[Circular]' if the argument
                        // TODO: let loopback folks know that they aren't returning the error as JSON for hasOne?
                        return debug('%s', err);
                      }
                      debug('created a globalConfigModel that belongs to ' + adminUser.username);

                      GlobalConfigModel.findOne({}, function(err, globalConfigObject) {
                        if (err) {
                          return debug('%j', err);
                        }
                        debug('found a GlobalConfigModel entry: ' + JSON.stringify(globalConfigObject,null,2));
                      });
                    });

                });
            });

          // create the retailer role
          Role.create({name: 'retailer'},
            function(err, role) {
              if (err) {
                return debug(err);
              }
              debug('role', role);
              // set merchant1 and merchant2 as retailers
              role.principals.create([
                  {
                    principalType: RoleMapping.USER,
                    principalId: retailUser.id
                  },
                  {
                    principalType: RoleMapping.USER,
                    principalId: anotherRetailUser.id
                  }
                ],
                function(err, principals) {
                  if (err) {
                    return debug(err);
                  }
                  debug('principals', principals);
                  debug(retailUser.username + ' now has role: ' + role.name);
                  debug(anotherRetailUser.username + ' now has role: ' + role.name);

                  // login w/ merchant1
                  UserModel.loginAsync({realm: 'portal', username: retailUser.username, password: 'merchant1'})
                    .tap(function(accessToken) { // create a default/empty report for merchant1
                      debug('created', JSON.stringify(accessToken,null,2));
                      debug('logged in w/ ' + retailUser.username + ' and token ' + accessToken.id);

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
                          debug('created reportModelInstance', JSON.stringify(reportModelInstance,null,2));
                          /*ReportModel.findOne({}, function(err, reportModelInstance) {
                            if (err) {
                              return debug('%j', err);
                            }
                            debug('found a ReportModel entry: ' + JSON.stringify(reportModelInstance,null,2));
                          });*/
                        });
                    })
                    .tap(function(accessToken) { // create store-config and store for merchant1
                      debug('logged in w/ ' + retailUser.username + ' and token ' + accessToken.id);
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
                                (created) ? debug('created', storeConfigModelInstance)
                                          : debug('found', storeConfigModelInstance);

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
                                        (created) ? debug('created', storeModelInstance)
                                                  : debug('found', storeModelInstance);
                                        return Promise.resolve();
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
                                            (created) ? debug('created', supplierModelInstance)
                                                      : debug('found', supplierModelInstance);
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
                });
            });

        })
        .catch(function(error){
          debug('error!');
          return debug('%j', error);
          //cb(error);
        });
    });

  });

};