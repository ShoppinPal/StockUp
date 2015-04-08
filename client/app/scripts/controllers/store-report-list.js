'use strict';

/**
 * @ngdoc function
 * @name ShoppinPalApp.controller:StoreReportListCtrl
 * @description
 * # SelectStoreCtrl
 * Controller of the ShoppinPalApp
 */
angular.module('ShoppinPalApp')
  .controller('StoreReportListCtrl',[
    '$scope', '$state',
    function ($scope, $state)
    {
      $scope.reportList = [
        'GlenStone - Mon 5th Apr 2015',
        'GlenStone - Fri 9th Jun 2015',
        'GlenStone - Tue 20th Nov 2015',
        'GlenStone - Wed 21st Nov 2015'
      ];

      /** @method generateOrder
       * This method will move to generate store report for particular store
       */
      $scope.generateOrder = function(){
        $state.go('store-report-manager');
      };

    }
  ]);
