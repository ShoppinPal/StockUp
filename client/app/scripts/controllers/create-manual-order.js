'use strict';

/**
 * @ngdoc function
 * @name ShoppinPalApp.controller:createManualOrderCtrl
 * @description
 * # createManualOrderCtrl
 * Controller of the ShoppinPalApp
 */
angular.module('ShoppinPalApp')
  .controller('createManualOrderCtrl', [
    '$scope',
    'SupplierModel', 'UserModel', 'LoopBackAuth',
    function($scope,
             SupplierModel, UserModel, LoopBackAuth)
    {
      $scope.suppliers = [];
      $scope.stores = [];


      /** @method viewContentLoaded
       * This method will load the storesReport from api on view load
       */
      $scope.$on('$viewContentLoaded', function() {
        SupplierModel.find({})
          .$promise.then(function(response) {
            $scope.suppliers = response;
            if($scope.suppliers && $scope.suppliers.length > 0) {
              $scope.selectedSupplier = $scope.suppliers[0];
            }

            return UserModel.storeModels({id: LoopBackAuth.currentUserId})
              .$promise.then(function(response){
                $scope.stores = response;
                if($scope.stores && $scope.stores.length > 0) {
                  $scope.selectedStore = $scope.stores[0];
                }
              });
          });
      });

    }
  ]);
