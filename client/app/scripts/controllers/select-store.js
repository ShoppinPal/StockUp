'use strict';

/**
 * @ngdoc function
 * @name ShoppinPalApp.controller:SelectStoreCtrl
 * @description
 * # SelectStoreCtrl
 * Controller of the ShoppinPalApp
 */
angular.module('ShoppinPalApp')
  .controller('SelectStoreCtrl', function ($scope,loginService) {

    $scope.stores = [];

    $scope.onSelectStore = function () {
            // alert("selected storename ==>"+store.storename);
              $location.path('/store-manager');
            };


    $scope.$on('$viewContentLoaded', function() {
      loginService.getSelectStore().then(function (response) {
            $scope.stores = response.data.stores;

          });
    });
   
  });
