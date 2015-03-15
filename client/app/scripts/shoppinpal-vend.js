angular.module('shoppinpal-vend',['ngResource', 'shoppinpal-constants'])
  .config(
    ['$httpProvider', 'apiKey',
      function($httpProvider, apiKey){
        'use strict';
        $httpProvider.defaults.headers.common['X-SHOPPINPAL-APIKEY'] = apiKey;
        $httpProvider.defaults.headers.common.Accept = 'application/json';
      }
    ]
  )
  .factory('$spVend',
    ['$resource', 'proxyUrl', 'StoreConfigModel', 'LoopBackAuth',
      function($resource, proxyUrl, StoreConfigModel, LoopBackAuth){
        'use strict';
        return {
          // will merchant's be able to execute this for anyone else's storeConfigId?
          // no because they won't be able to access it with their parse X-Parse-Session-Token
          // TODO: check on server side if it receives X-Parse-Session-Token
          registers: function (storeConfigId) {
            return $resource('api/StoreConfigModels/:storeConfigId/vend/registers', null, {
              query: {
                method: 'GET',
                params: {
                  'storeConfigId': storeConfigId,
                  'state': LoopBackAuth.accessTokenId //$sessionStorage.currentUser.sessionToken
                }
              }
            });
          },
          outlets: function (storeConfigId) {
            return $resource('api/StoreConfigModels/:storeConfigId/vend/outlets', null, {
              query: {
                method: 'GET',
                params: {
                  'storeConfigId': storeConfigId,
                  'state': LoopBackAuth.accessTokenId //$sessionStorage.currentUser.sessionToken
                }
              }
            });
          },
          taxes: function (storeConfigId) {
            return $resource('api/StoreConfigModels/:storeConfigId/vend/taxes', null, {
              query: {
                method: 'GET',
                params: {
                  'storeConfigId': storeConfigId,
                  'state': LoopBackAuth.accessTokenId //$sessionStorage.currentUser.sessionToken
                }
              }
            });
          },
          paymentTypes: function (storeConfigId) {
            return $resource('api/StoreConfigModels/:storeConfigId/vend/payment_types', null, {
              query: {
                method: 'GET',
                params: {
                  'storeConfigId': storeConfigId,
                  'state': LoopBackAuth.accessTokenId //$sessionStorage.currentUser.sessionToken
                }
              }
            });
          },
          init: {
            store: function(aScope, aSpVend, registerListener){
              // populate outletIds and registerIDs from Vend
              return aSpVend.registers(aScope.storeConfig.objectId).query()
                .$promise.then(function(response) {
                  if (response && response.registers) {
                    aScope.registers = response.registers;
                    _.each(response.registers, function(register){
                      /* jshint camelcase: false */
                      aScope.outletByRegisterId[register.id] = register.outlet_id;
                    });
                    console.log('$scope.outletByRegisterId: ' + JSON.stringify(aScope.outletByRegisterId));
                    aScope.$watch('store.registerId', registerListener);
                  }
                  return Parse.Promise.as();
                },
                function(error){
                  return Parse.Promise.error({
                    message: error.statusText,
                    code: error.status
                  });
                });
            },
            paymentType: function(aScope, aSpVend, aStoreConfig){
              //console.log('storeConfig.posUrl: '+ storeConfig.posUrl);
              return aSpVend.paymentTypes(aStoreConfig.objectId).query()
                .$promise.then(function(response){
                  /* jshint camelcase: false */
                  for(var i=0;i<response.payment_types.length;i++){ // TODO: use underscore library for looping
                    if(response.payment_types[i].name.toLowerCase() === 'shoppinpal'){
                      aScope.paymentTypeName = response.payment_types[i].name;
                      aScope.paymentTypeId = response.payment_types[i].id;
                      break;
                    }
                  }
                  return Parse.Promise.as();
                });
            }
          },
          utils: {
            findTaxforOutlet: function(vendOutlet, vendTaxes) {
              var matchingTaxObject = _.find(vendTaxes, function(vendTax){
                /* jshint camelcase: false */
                return (vendTax.id === vendOutlet.tax_id);
              });
              return (matchingTaxObject) ? matchingTaxObject.rate : undefined;
            },
            findRegisterIdforOutlet: function(outletId, vendRegisters) {
              var matchingRegisterObject = _.find(vendRegisters, function(vendRegister){
                /* jshint camelcase: false */
                return (vendRegister.outlet_id === outletId);
              });
              return (matchingRegisterObject) ? matchingRegisterObject.id : undefined;
            },
            autoPopulateStores: function($aSpVend, $aSpUtils, $aSpAlerts, $aFilter, ngStoreConfigObject){
              console.log('inside autoPopulateStores()');
              console.log('will try to fetch registers');
              return $aSpVend.registers(ngStoreConfigObject.objectId).query()
                .$promise.then(function(response) {
                  console.log('Fetched all registers from Vend.');
                  //console.log('fetched all registers: '+ JSON.stringify(response));
                  if (response && response.registers && response.registers.length>0) {
                    return Parse.Promise.as(response.registers);
                  }
                  else {
                    return Parse.Promise.error({
                      message: 'To proceed with setup please configure at least one register in Vend.',
                      code: 404
                    });
                  }
                })
                .then(function(vendRegisters){
                  console.log('will try to fetch taxes');
                  return $aSpVend.taxes(ngStoreConfigObject.objectId).query()
                    .$promise.then(function(response) {
                      console.log('fetched all taxes');
                      if (response && response.taxes && response.taxes.length>0) {
                        return Parse.Promise.as({vendRegisters: vendRegisters, vendTaxes:response.taxes});
                      }
                      else {
                        return Parse.Promise.error({
                          message: 'Please configure at least one tax in Vend POS before proceeding.',
                          code: 404
                        });
                      }
                    });
                })
                .then(function(registersAndTaxes){
                  console.log('will try to correlate registersAndTaxes');
                  return $aSpVend.outlets(ngStoreConfigObject.objectId).query()
                    .$promise.then(function(response) {
                      console.log('fetched all outlets');
                      if (response &&
                          response.outlets &&
                          response.outlets.length>0)
                      {
                        //console.log(ngStoreConfigObject.storeModels);
                        console.log('skip over stores which already exist');
                        var listOfExistingStoreApiIds = _.pluck(ngStoreConfigObject.storeModels, 'api_id');
                        var remainingStores = _.filter(response.outlets, function(outlet){
                          var value = outlet.id;
                          console.log('!_.contains('+listOfExistingStoreApiIds+', '+value+')');
                          console.log(!_.contains(listOfExistingStoreApiIds, value));
                          return !_.contains(listOfExistingStoreApiIds, value);
                        });
                        console.log('remainingStores');
                        console.log(remainingStores);

                        if (remainingStores.length > 0) {
                          var promises = [];
                          _.each(remainingStores, function(vendOutlet){
                            /* jshint camelcase: false */
                            var newStore = {
                              name: vendOutlet.name,
                              addressLine1: vendOutlet.physical_address1,
                              addressLine2: vendOutlet.physical_address2,
                              city: vendOutlet.physical_city,
                              state: vendOutlet.physical_state,
                              postalCode: vendOutlet.physical_postcode,
                              country: vendOutlet.physical_country_id,
                              phone: $aFilter('phone')(
                                vendOutlet.physical_country_id,
                                ($aFilter('phone')(vendOutlet.physical_country_id, vendOutlet.contact.phone)) ? $aFilter('phone')(vendOutlet.physical_country_id,vendOutlet.contact.phone) : $aFilter('phone')(vendOutlet.physical_country_id,vendOutlet.contact.mobile)
                              ),
                              tax_rate: $aSpVend.utils.findTaxforOutlet(vendOutlet, registersAndTaxes.vendTaxes),
                              // TODO: There can be more than one registers in an outlet.
                              //       By default, is it enough to assign the first one we find
                              //       for an outlet?
                              registerId: $aSpVend.utils.findRegisterIdforOutlet(vendOutlet.id, registersAndTaxes.vendRegisters),
                              api_id: vendOutlet.id,
                              //vendPaymentSuccessState: $scope.successState, //TODO: for the retailer to decide but should we have a default?
                              hideOutOfStockProducts: true
                              // creating a relationship with storeConfig is the responsibility of the api call
                              // that populates a StoreModel through StoreConfigModel
                            };

                            promises.push(
                              $aSpUtils.utils.calculateAndAssignCoordinates($aSpUtils, newStore)
                                .then(null,function(error){
                                  // NOTE: If an error occurs while attempting geocoding then we should catch the failure and keep on going.
                                  // http://stackoverflow.com/questions/22827941/continuing-after-failing-a-promise
                                  console.log(error);
                                  return Parse.Promise.as(newStore);
                                })
                                .then(function(store){
                                  store.userModelToStoreModelId = LoopBackAuth.currentUserId; // explicitly create a relationship with the user
                                  return StoreConfigModel.storeModels.create(
                                    {id: ngStoreConfigObject.objectId},
                                    store
                                  )
                                    .$promise.then(function(storeObject){
                                      console.log('saved with storeObject.objectId: ' + storeObject.objectId);
                                      console.log('saved with storeObject.hours: ' + JSON.stringify(storeObject.hours));
                                      return Parse.Promise.as();
                                    });
                                })
                            );
                          });
                          return Parse.Promise.when(promises)// NOTE: should the promises going into when(), have their own error handlers?
                            .then(function(){
                              console.log('saved all stores for storeObject.objectId: ' + ngStoreConfigObject.objectId);
                              $aSpAlerts.addAlert(
                                'Please reload the page to see the updated list.',
                                'info');
                              return Parse.Promise.as(ngStoreConfigObject);
                            });
                        }
                        else {
                          console.log('no new stores for storeObject.objectId: ' + ngStoreConfigObject.objectId);
                          $aSpAlerts.addAlert(
                            'There aren\'t any new locations to add.',
                            'info');
                          return Parse.Promise.as(ngStoreConfigObject);
                        }
                      }
                      else { // TODO: this block doesn't make sense - fix it or remove it
                        console.log('Could not auto-magically create stores for storeConfigObject.objectId: ' + ngStoreConfigObject.objectId);
                        //$state.go('editStore', {storeConfigId:ngStoreConfigObject.objectId});
                        return Parse.Promise.as(ngStoreConfigObject);
                      }
                    },
                    function(error){
                      console.log(error);
                      return Parse.Promise.error({
                        message: error.statusText,
                        code: error.status
                      });
                    });
                });
            }
          }
        };
      }
    ]
  );
