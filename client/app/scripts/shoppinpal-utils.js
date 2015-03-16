var urlBase = 'http://localhost:3000/api';
var authHeader = 'authorization';

angular.module('shoppinpal-utils',['ngResource', 'ngStorage', 'geocoder', 'shoppinpal-constants','shoppinpal-loopback'])
  .factory('$spUtils',
    ['$resource', 'proxyUrl', 'Geocoder', 'StoreConfigModel', 'StoreModel', 'UserModel', 'LoopBackAuth',
      function($resource, proxyUrl, Geocoder, StoreConfigModel, StoreModel, UserModel, LoopBackAuth){
        'use strict';
        var apiUrl = 'https://' + proxyUrl + '/v1/api/';
        console.log(apiUrl); // todo: remove?

        return {
          utils: {
            getLatLong: function (store){
              if(store){
                var addressFormatted = '';
                if (store.addressLine1) {
                  addressFormatted += store.addressLine1;
                  if (store.addressLine2) {
                    addressFormatted += ' ' + store.addressLine2;
                  }
                }
                if (store.city) {
                  addressFormatted += ' ' + store.city;
                }
                if (store.state) {
                  addressFormatted += ' ' + store.state;
                }
                if (store.postalCode) {
                  addressFormatted += ' ' + store.postalCode;
                }
                if (store.country) {
                  addressFormatted += ' ' + store.country;
                }
                console.log('addressFormatted: ' + addressFormatted);
                return Geocoder.latLngForAddress(addressFormatted)
                  .then(function(result){
                    console.log('succesfully geocoded address: ' + addressFormatted);
                    return Parse.Promise.as(result);
                  },
                  function(error){
                    console.log('failed to geocode address: ' + addressFormatted);
                    console.log(error);
                    return Parse.Promise.as(); // we always want to return success as this is a nice-to-have
                  });
              }
              else {
                return Parse.Promise.as();
              }
            },
            calculateAndAssignCoordinates: function ($spUtils, store) {
              console.log('calculateAndAssignCoordinates for ' + store.name);
              return $spUtils.utils.getLatLong(store)
                .then(function(data){
                  if (data) {
                    store.location = {
                      lat: data.lat,
                      lng: data.lng
                    };
                  }
                  return Parse.Promise.as(store);
                });
            },
            loadStoreConfigsAndStores: function ($aScope, $aState, controllerName){
              return UserModel.storeConfigModels({id: LoopBackAuth.currentUserId, filter:{include:'storeModels'}}) // 1) fetched all storeConfigs (where ACLs allow access for current user)
                .$promise.then(function(storeConfigs) {
                  console.log(controllerName + ' 2) added all of the storeConfigs (for current user) to the $scope');
                  //console.log('storeConfigs:\n' + JSON.stringify(storeConfigs, null, 2));
                  if (storeConfigs.length === 0) {
                    console.log(controllerName + ' No StoreConfigModels found! Redirecting to onboarding');
                    $aState.go('onboarding');
                    //return Parse.Promise.error(''); not returning a promise should break the chain and have the intended effect?
                  }
                  else {
                    $aScope.storeConfigs = storeConfigs;
                    return Parse.Promise.as(storeConfigs);
                  }
                }) // 2) added all of the storeConfigs (for current user) to the $scope
                .then(function(/*storeConfigs*/){
                  console.log(controllerName + ' 3) fetched all stores (public read access)');
                  return UserModel.storeModels({id: LoopBackAuth.currentUserId}) //return StoreConfigModel.storeModels({id: storeConfigs[0].objectId})
                    .$promise.then(function(stores){
                      //console.log('stores:\n' + JSON.stringify(stores,null,2));
                      $aScope.stores = stores;
                      return Parse.Promise.as(stores);
                    });
                }) // 3) fetched all stores (public read access)
                .then(function(/*stores*/){
                  console.log(controllerName + ' 4) tied the stores to their respective storeConfigs');
                  // Convert the Array of StoreConfigModels into a Map
                  var storeConfigsById = {};
                  _.each($aScope.storeConfigs, function(storeConfig){
                    storeConfig.stores = [];
                    storeConfigsById[storeConfig.objectId] = storeConfig;
                  });
                  $aScope.storeConfigsById = storeConfigsById;
                  //console.log('filled in store details:\n' + JSON.stringify($aScope.storeConfigs,null,2));
                  //console.log('$aScope.storeConfigs.length: ' + $aScope.storeConfigs.length);
                  return Parse.Promise.as($aScope.storeConfigs);
                }) // 4) tied the stores to their respective storeConfigs
                .then(function(){
                  if($aScope.storeConfigs) {
                    console.log(controllerName + ' 5) set the default storeConfig to use with this scope');
                    $aScope.selected.storeConfig = $aScope.storeConfigs[0].objectId; //TODO: rename $aScope.selected.storeConfig to $aScope.selected.storeConfigId
                    console.log(controllerName + ' - ' + 'THEN - $aScope.selected.storeConfig: ' + $aScope.selected.storeConfig);

                    // TODO: redirect the user to add stores if there are none configured yet
                    //       make sure to let the user know why you're sending them away
                  }
                  return Parse.Promise.as();
                }, // 5) set the default storeConfig to use with this scope
                function(error){
                  console.log('error: ' + controllerName + ': ' + error);
                  return Parse.Promise.error(error);
                });
            },
            importProducts : function (storeConfigId, storeId, $http, $spAlerts) { // TODO: can NOT be part of a bigger promise chain as-is
              return $http.get('/api/products/import/'+ storeConfigId + '/' + storeId)
                .then(function(result) {
                  console.log(result);
                  $spAlerts.addAlert('Product import started, it should be finished in less than 15 minutes.', 'info');
                  //return Parse.Promise.as();
                },
                function(error){
                  console.log(error);
                  $spAlerts.addAlert('Import products request failed, please re-try or email support@shoppinpal.com', 'danger');
                  //return Parse.Promise.error(error);
                });
            }
          }
        };
      }
    ]
  );
