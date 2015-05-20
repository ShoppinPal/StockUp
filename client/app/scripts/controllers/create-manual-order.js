'use strict';

/**
 * @ngdoc function
 * @name ShoppinPalApp.controller:createManualOrderCtrl
 * @description
 * # createManualOrderCtrl
 * Controller of the ShoppinPalApp
 */
angular.module('ShoppinPalApp')
    .controller('createManualOrderCtrl', ['$scope','SupplierModel', function($scope,SupplierModel) {
      console.log($scope);
      $scope.stores = [];


      /** @method viewContentLoaded
       * This method will load the storesReport from api on view load
       */
      $scope.$on('$viewContentLoaded', function() {
        SupplierModel.find({
        })
        .$promise.then(function(response) {
            console.log(response[0].name);
            $scope.stores = response;
            $scope.selectedOrderStore = response[0].name;
            $scope.selectedDeliverStore = response[0].name;
          });
      });

    }]);
