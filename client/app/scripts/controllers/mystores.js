'use strict';

angular.module('ShoppinPalApp')
  .controller('MyStoresCtrl',
    ['$scope', '$sessionStorage', '$state', '$http', '$filter', /* angular's modules/services/factories etc. */
      '$spAlerts', '$spUtils', '$spVend', '$spPrestashop',/* shoppinpal's custom modules/services/factories etc. */
      function (
        $scope, $sessionStorage, $state, $http, $filter,
        $spAlerts, $spUtils, $spVend, $spPrestashop)
      {
        /* jshint camelcase: false */

        $scope.controllerName = 'MyStoresCtrl';
        $scope.stores = [];
        $scope.storeConfigs = [];
        $scope.storeConfigsById = {};
        $scope.selected = {
          storeConfig: undefined, // we persist an ID here // TODO: change variable name to storeConfigId
          store: undefined // we persist an object here
        };

        // =========
        // Load Page
        // =========
        $scope.myPromise = $spUtils.utils.loadStoreConfigsAndStores($scope, $state, 'MyStoresCtrl')
          .then(function(){
            console.log('MyStoresCtrl initialized...');
          },
          function(error){
            console.log('error: ' + error);
          });

        // ============================
        // Code for any remaining setup
        // ============================

        $scope.autoAddRemainingStores = function(ngStoreConfigObject){
          console.log('inside autoAddRemainingStores()');
          if(ngStoreConfigObject.posVendor === 'prestashop') {
            return $spPrestashop.utils.autoPopulateStores($spPrestashop, $spUtils, $spAlerts, ngStoreConfigObject);
          }
          else if(ngStoreConfigObject.posVendor === 'vend') {
            return $spVend.utils.autoPopulateStores($spVend, $spUtils, $spAlerts, $filter, ngStoreConfigObject);
          }
          else {
            $spAlerts.addAlert(
              'This feature has not been implemented for ' + ngStoreConfigObject.posVendor,
              'info');
          }
        };

        // ====================================================
        // Alert code which cannot be directly called from HTML
        // ====================================================
        $scope.closeAlert = function(index) {
          console.log('calling closeAlert() from mystores.js');
          $spAlerts.closeAlert(index);
        };

      }
    ]
  );
