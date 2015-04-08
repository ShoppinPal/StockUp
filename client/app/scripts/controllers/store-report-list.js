'use strict';

/**
 * @ngdoc function
 * @name ShoppinPalApp.controller:StoreReportListCtrl
 * @description
 * # SelectStoreCtrl
 * Controller of the ShoppinPalApp
 */
angular.module('ShoppinPalApp')
  .controller('StoreReportListCtrl', function ($scope,$state) {

    $scope.reportList = ['GlenStone','Skelly','ParkWay','kellog'];
 

    /** @method generateOrder
      * This method will move to generate store report for particular store
      */
    $scope.generateOrder = function(){
      $state.go('store-report-manager');
    };

  });
