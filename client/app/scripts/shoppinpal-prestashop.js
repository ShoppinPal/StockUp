angular.module('shoppinpal-prestashop',['ngResource', 'shoppinpal-constants'])
  .config(
  ['$httpProvider', 'apiKey',
    function($httpProvider, apiKey){
      'use strict';
      $httpProvider.defaults.headers.common['X-SHOPPINPAL-APIKEY'] = apiKey;
      $httpProvider.defaults.headers.common.Accept = 'application/json';
    }
  ]
)
  .factory('$spPrestashop',
  ['$resource', 'proxyUrl', 'apiKey',
    function($resource, proxyUrl, apiKey, StoreConfigModel, LoopBackAuth){
      'use strict';

      // TODO: update relevant proxy in APIGEE and then pass apikey strictly thru the header
      return {
        products: function (token){
          return $resource('https://' + proxyUrl + '/v1/prestashop/prestashop/api/products',null,{
            list: {
              method: 'GET',
              params: {
                'ws_key': token,
                'apikey': apiKey
              }
            }
          });
        },
        customers: function (token){
          return $resource('https://' + proxyUrl + '/v1/prestashop/prestashop/api/customers',null,{
            create: {
              method: 'POST',
              params: {
                'ws_key': token,
                'apikey': apiKey
              }
            }
          });
        },
        stores: function (token){
          return $resource('https://' + proxyUrl + '/v1/prestashop/prestashop/api/stores/:storeId',null,{
            query: {
              method: 'GET',
              params: {
                'ws_key': token,
                'apikey': apiKey
              }
            },
            fetch: {
              method: 'GET',
              params: {
                'ws_key': token,
                'apikey': apiKey
              }
            }
          });
        },
        utils : {
          autoPopulateStores: function($aSpPrestashop, $aSpUtils, $aSpAlerts, ngStoreConfigObject){
            return $aSpPrestashop.stores(ngStoreConfigObject.accessToken).query()
              .$promise.then(function(response) {
                console.log('got a list of all the prestashop stores');
                //console.log(JSON.stringify(response));
                if (response &&
                  response.prestashop.stores &&
                  response.prestashop.stores.store &&
                  response.prestashop.stores.store.length>0)
                {
                  console.log('getting details for each prestashop store');
                  var processPromisesSerially = Parse.Promise.as();

                  //console.log(ngStoreConfigObject.storeModels);
                  console.log('skip over stores which already exist');
                  var listOfExistingStoreApiIds = _.pluck(ngStoreConfigObject.storeModels, 'api_id');
                  var remainingStores = _.filter(response.prestashop.stores.store, function(store){
                    var value = ('' + store.id);
                    console.log('!_.contains('+listOfExistingStoreApiIds+', '+value+')');
                    console.log(!_.contains(listOfExistingStoreApiIds, value));
                    return !_.contains(listOfExistingStoreApiIds, value);
                  });
                  console.log('remainingStores');
                  console.log(remainingStores);

                  _.each(remainingStores, function(store){
                    console.log(store.id);
                    processPromisesSerially = processPromisesSerially.then(function(){
                      $aSpPrestashop.stores(ngStoreConfigObject.accessToken).fetch({
                        storeId:store.id
                      })
                        .$promise.then(function(response){
                          /* jshint camelcase: false */

                          //console.log(JSON.stringify(response.prestashop,null,2));
                          var prestashopStore = response.prestashop.store;
                          //console.log(JSON.stringify(prestashopStore,null,2));

                          // console.log('will map prestashopStore to parseStore');
                          var newStore = {
                            name: prestashopStore.name,
                            addressLine1: prestashopStore.address1,
                            city: prestashopStore.city,
                            postalCode: '' + prestashopStore.postcode, // convert to string
                            api_id: '' + prestashopStore.id, // convert to string
                            hideOutOfStockProducts: true
                          };

                          return $aSpUtils.utils.calculateAndAssignCoordinates($aSpUtils, newStore)
                            .then(null,function(error){
                              // NOTE: If an error occurs while attempting geocoding then we should catch the failure and keep on going.
                              // http://stackoverflow.com/questions/22827941/continuing-after-failing-a-promise
                              console.log(error);
                              return Parse.Promise.as(newStore);
                            })
                            .then(function(store){
                              //console.log('about to save a store');
                              store.userModelToStoreModelId = LoopBackAuth.currentUserId; // explicitly create a relationship with the user
                              return StoreConfigModel.storeModels.create(
                                {id: ngStoreConfigObject.objectId},
                                store
                              )
                                .then(function(storeObject){
                                  console.log('saved with storeObject.objectId: ' + storeObject.objectId);
                                  return Parse.Promise.as();
                                });
                            });
                        });
                    });
                  });
                  return processPromisesSerially
                    .then(function(){
                      console.log('saved all stores for storeObject.objectId: ' + ngStoreConfigObject.objectId);
                      $aSpAlerts.addAlert(
                        'Please reload the page to see the updated list.',
                        'info');
                      return Parse.Promise.as(ngStoreConfigObject);
                    });
                  /*.then(function(){
                   // To reload/re-render the page with ui-router http://stackoverflow.com/questions/19583170/route-reload-does-not-work-with-ui-router
                   $state.go($state.$current, null, {reload: true});
                   });*/
                }
                else {
                  return Parse.Promise.error({
                    message: 'To proceed with setup please configure at least one store in PrestaShop.',
                    code: 404
                  });
                }
              });
          }
        }
      };
    }
  ]
);
