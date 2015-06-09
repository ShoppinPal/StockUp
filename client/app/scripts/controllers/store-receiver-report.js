'use strict';

/**
 * @ngdoc function
 * @name ShoppinPalApp.controller:WarehouseReportCtrl
 * @description
 * # WarehouseReportCtrl
 * Controller of the ShoppinPalApp
 */
angular.module('ShoppinPalApp')
  .controller('StoreReceiverCtrl',[
    '$scope','$state','$sessionStorage',
    'loginService',
    function ($scope, $state, $sessionStorage,
              loginService)
    {
      $scope.storeName = $sessionStorage.currentStore.name;

      $scope.closedboxes = [{ 'key': 'Box1',
    'value': 1},{ 'key': 'Box2',
    'value': 2}];

      /** @method decreaseQty
       * @param storereport
       * This method decreases the ordered quantity ,when user tap on '-'' sign
       */
      $scope.decreaseQty = function(storereport) {
        storereport.orderQuantity = parseInt(storereport.orderQuantity); // parse it from string to integer
        if(storereport.orderQuantity >0){
          storereport.orderQuantity -= 1;
        }
      };

      /** @method increaseQty
       * @param storereport
       * This method increase the ordered quantity ,when user tap on '+' sign
       */
      $scope.increaseQty = function(storereport) {
        storereport.orderQuantity = parseInt(storereport.orderQuantity);
        storereport.orderQuantity += 1;
      };
      
     /** @method editRecievedQty()
       * @param selectedRow
       * This method display the edit functionlity on right swipe
       */
      $scope.editRecievedQty = function(selectedRow) {
        $scope.selectedRowIndex = selectedRow;
      };

      /** @method viewContentLoaded
       * This method will load the storesReport from api on view load
       */
      $scope.$on('$viewContentLoaded', function() {
        loginService.getSelectStore().then(function (response) {
          $scope.storesReport = response;
        });
      });

    }
   ]);