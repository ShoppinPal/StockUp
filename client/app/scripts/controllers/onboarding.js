/**
 * Created by megha on 3/27/14.
 */
//Onboarding controller for all the onboard steps
angular.module('ShoppinPalApp')
  .controller('OnboardingCtrl', [
    '$scope', '$sessionStorage', '$state', '$stateParams', '$filter', /* angular's modules/services/factories etc. */
    '$spAlerts', '$spUtils', '$spPrestashop', '$spVend', /* shoppinpal's custom modules/services/factories etc. */
    'StoreConfigModel', 'UserModel', 'LoopBackAuth', /* loopback models */
    'uuid4', /* 3rd party custom modules/services/factories etc. */
    'vendAuthEndpoint', 'vendClientId', 'proxyUrl', 'baseUrl', /* constants */
    function ($scope, $sessionStorage, $state, $stateParams, $filter,
              $spAlerts, $spUtils, $spPrestashop, $spVend,
              StoreConfigModel, UserModel, LoopBackAuth,
              uuid4,
              vendAuthEndpoint, vendClientId, proxyUrl, baseUrl)
    {
      'use strict';
      $scope.headerImg = 'Regular_symbol_small.jpg';
      $scope.heading = 'Getting Started';
      //$scope.data_value = ['US','Canada','Spain','India','Australia'];
      //$scope.dt_value = $scope.data_value[0];

      $scope.posSystems = [
        {name: 'vend', type: 'Cloud', display: 'Vend'},
        {name: 'prestashop', type: 'Cloud', display: 'PrestaShop'}/*,
        {name: 'lightspeed', type: 'Local', display: 'LightSpeed'},
        {name: 'intuit', type: 'Local', display: 'Intuit'}*/
      ];

      $scope.newStoreConfig = {};

      // load state variable(s) into the $scope
      $scope.storeConfigId = $stateParams.storeConfigId;
      console.log('$stateParams.storeConfigId: ', $stateParams.storeConfigId);

      if($stateParams.pos) { // TODO: pick out the posSystem by loading the storeConfig instead?
        // NOTE: ngModel compares by reference, not value. This is important when binding to an array of objects
        //       http://jsfiddle.net/qWzTb/
        //       https://docs.angularjs.org/api/ng/directive/select
        if ($stateParams.pos === 'vend') {
          console.log('$stateParams.pos: ', $stateParams.pos);
          $scope.newStoreConfig.posSystem = $scope.posSystems[0];
          //console.log('$scope.newStoreConfig.posSystem: ', $scope.newStoreConfig.posSystem);
        }
        if ($stateParams.pos === 'prestashop') {
          console.log('$stateParams.pos: ', $stateParams.pos);
          $scope.newStoreConfig.posSystem = $scope.posSystems[1];
          //console.log('$scope.newStoreConfig.posSystem: ', $scope.newStoreConfig.posSystem);
        }
      }

      // =========
      // Load Page
      // =========
      // HACK: for adding oauth to existing stores
      if($stateParams.storeConfigId) {
        console.log('HACK: for adding oauth to existing stores');
        $scope.myPromise = StoreConfigModel.findById({id: $stateParams.storeConfigId})
          .$promise.then(function(storeConfig){
            //console.log('storeConfig:\n' + JSON.stringify(store,null,2));
            $scope.storeConfig = storeConfig;
          });
      }

      // ==================
      // Vend related code
      // ==================
      $scope.vend = {};
      $scope.vend.authEndpoint = vendAuthEndpoint;
      $scope.vend.clientId = encodeURIComponent(vendClientId);
      $scope.vend.redirectUri = encodeURIComponent(baseUrl + '/api/StoreConfigModels/token/vend');
      console.log('Vend Url: '+ $scope.vend.authEndpoint +
        '?response_type=code'+
        '&client_id=' + $scope.vend.clientId +
        '&state='+ LoopBackAuth.accessTokenId +
        '&redirect_uri=' + $scope.vend.redirectUri);
      $scope.vend.loginUrl = function(){
        return $scope.vend.authEndpoint +
          '?response_type=code'+
          '&client_id=' + $scope.vend.clientId +
          '&state='+ LoopBackAuth.accessTokenId +
          '&redirect_uri=' + $scope.vend.redirectUri;
      };

      // ====================================================
      // Data Binding code for onboarding.html view
      // ====================================================

      $scope.addNewStoreConfig = function(){
        console.log('addNewStoreConfig()');
        $scope.myPromise = $scope.saveStoreConfigData()
          .then(function(ngStoreConfigObject){
            console.log('inside addNewStoreConfig');
            console.log(ngStoreConfigObject);
            if (ngStoreConfigObject) {
              console.log('saved with storeConfigObject.objectId: ' + ngStoreConfigObject.objectId);
              return Parse.Promise.as(ngStoreConfigObject);
            } else {
              return Parse.Promise.error({
                message: 'Failed to save store configuration',
                code: 500
              });
            }
          })
          .then(function(ngStoreConfigObject){
            if (ngStoreConfigObject.posVendor === 'prestashop') { // auto populate stores from Prestashop
              // console.log('auto-populate stores from prestashop');
              return $spPrestashop.utils.autoPopulateStores($spPrestashop, $spUtils, $spAlerts, ngStoreConfigObject);
            }
            else if(ngStoreConfigObject.posVendor === 'vend') { // auto populate stores from Vend
              // console.log('auto-populate stores from vend');
              return $spVend.utils.autoPopulateStores($spVend, $spUtils, $spAlerts, $filter, ngStoreConfigObject);
            } // populated stores from Vend
            else {
              console.log('Non-automated pos, so we will not auto-create stores for storeConfigObject.objectId: ' + ngStoreConfigObject.objectId);
              return Parse.Promise.as(ngStoreConfigObject);
            }
          })
          .then(function(){
            $state.go('mystores');
            return Parse.Promise.as();
          })
          .then(function(){
            return Parse.Promise.as();
          },
          function( error ){
            console.log(error);
            if (error && error.data && error.data.error) {
              $spAlerts.addAlert(error.data.error, 'danger');
            }
            if (error && error.message) {
              $spAlerts.addAlert(error.message, 'danger');
            }
          });
      };

      // Function to save new StoreConfig data in parse and returning a promise with store_config objectId.
      $scope.saveStoreConfigData = function() {
        if($scope.newStoreConfig.posSystem.name === 'prestashop') {
          // validate if we can connect to PrestaShop
          return $spPrestashop.stores($scope.newStoreConfig.prestawstoken).query()
            .$promise.then(function(response) {
              console.log('Fetched all PrestaShop stores: ');
              console.log(response);
              if (response &&
                response.prestashop.stores &&
                response.prestashop.stores.store &&
                response.prestashop.stores.store.length>0)
              {
                //return Parse.Promise.as(response.stores.store);
                var newStoreConfig = {
                  name: $scope.newStoreConfig.businessName,
                  posVendor: $scope.newStoreConfig.posSystem.name,
                  posUrl: 'https://' + $scope.newStoreConfig.prestaurl,
                  accessToken: $scope.newStoreConfig.prestawstoken,
                  currencyCode: $scope.newStoreConfig.currencyCode,
                  webhookToken: uuid4.generate(),
                  productImportRules: {
                    'op':'AND',
                    'rules':[
                      {
                        'applyTo':'inventory',
                        'condition':'greaterThan',
                        'field':'count',
                        'values':['0']
                      }
                    ]
                  }
                };
                return UserModel.storeConfigModels.create(
                  {id: LoopBackAuth.currentUserId},
                  newStoreConfig
                )
                  .$promise.then(function(response){
                    return Parse.Promise.as(response);
                  });
              }
              else {
                return Parse.Promise.error({
                  message: 'To proceed with setup please configure at least one store in PrestaShop.',
                  code: 404
                });
              }
            });
          /*
          return prestashop.customers($scope.newStoreConfig.prestawstoken).create({
            prestashop: {
              customer: {
                lastname: 'Sub',
                firstname: 'Sri',
                email: 'ss@s.com',
                passwd: 'secret'
              }
            }
          })
            .$promise.then(function(response) {
              // do something clever
              // at least return empty promise
              console.log(response);
              //return Parse.Promise.as(); // OR use: return q();
              return newStoreConfig.$save();
            });  */
        }
        if($scope.newStoreConfig.posSystem.name === 'vend'){
          console.log('storeConfig should have already been created by backend due to oauth, so now updating it with remaining data');
          var additionalStoreConfigData = {
            name: $scope.newStoreConfig.businessName,
            posVendor: $scope.newStoreConfig.posSystem.name,
            /*posUrl: 'https://' + $scope.newStoreConfig.vendurl,
            username: $scope.newStoreConfig.vendusername,
            password: $scope.newStoreConfig.vendpassword,*/
            currencyCode: $scope.newStoreConfig.currencyCode,
            webhookToken: uuid4.generate(),
            promos: [
              {category:'Featured', discount:0, code:'promo123'}
            ],
            categoryMapping: $scope.newStoreConfig.categoryMapping,
            productImportRules: {
              'op':'AND',
              'rules':[
                {
                  'applyTo':'inventory',
                  'condition':'greaterThan',
                  'field':'count',
                  'values':['0']
                },
                {
                  'condition': 'doesNotExist',
                  'field': 'variant_parent_id'
                },
                {
                  'condition':'doesNotContainSubString',
                  'field':'image',
                  'skipIfFieldExists': 'variant_parent_id',
                  'values':[
                    'images/placeholder/product/no-image-white-original.png',
                    'images/placeholder/product/no-image-white-thumb.png',
                    'images/placeholder/uploading/uploading-white-original.gif',
                    'images/placeholder/uploading/uploading-white-thumb.gif'
                  ]
                }
              ]
            }
          };
          // TODO: update instead of create
          return StoreConfigModel.prototype$updateAttributes(
            { id: $stateParams.storeConfigId },
            additionalStoreConfigData // TODO: model in $scope isn't being updated?
          )
            .$promise.then(function(response){
              console.log('vend storeConfig update response: ' + JSON.stringify(response,null,2));
              // TODO: not sure if loopback returns anything?
              // TODO: if it does, maybe we don't need to load store config explicitly below?
              return Parse.Promise.as(response)
                .then(function(){
                  return StoreConfigModel.findById({id: $stateParams.storeConfigId}) // $scope.storeConfigId would also work
                    .$promise.then(function(ngStoreConfigObject){
                      console.log('loaded storeConfigObject.objectId: ' + ngStoreConfigObject.objectId);
                      return Parse.Promise.as(ngStoreConfigObject);
                    });
                });
            },
            function(error){
              console.log(error);
              return Parse.Promise.error({
                message: 'Failed to update the vend storeConfig data in Loopback',
                code: 404
              });
            });
        }
        /*else if($scope.newStoreConfig.posSystem.name === 'lightspeed'){
          newStoreConfig = new StoreConfig({
            posVendor: $scope.newStoreConfig.posSystem.name,
            posUrl: $scope.newStoreConfig.lsurl,
            posLicensekey: $scope.newStoreConfig.lslicensekey
          });
          return newStoreConfig.$save();
        }
        else if($scope.newStoreConfig.posSystem.name === 'intuit'){
          newStoreConfig = new StoreConfig({
            posVendor: $scope.newStoreConfig.posSystem.name,
            posUrl: $scope.newStoreConfig.intuiturl,
            posLicensekey: $scope.newStoreConfig.intuitlicensekey
          });
          return newStoreConfig.$save();
        }*/
        else {
          console.log('Select proper POS from dropdown');
          return Parse.Promise.error({
            message: 'Please select proper POS from dropdown',
            code: 404
          });
        }
      };

      $scope.closeAlert = $spAlerts.closeAlert;

    }
  ]);
