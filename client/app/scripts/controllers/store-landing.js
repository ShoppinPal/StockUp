'use strict';

/**
 * @ngdoc function
 * @name ShoppinPalApp.controller:StoreLandingCtrl
 * @description
 * # StoreLandingCtrl
 * Controller of the ShoppinPalApp
 */
angular.module('ShoppinPalApp')
  .controller('StoreLandingCtrl',['$scope','loginService',
  	function ($scope,loginService){

  		/** @method viewContentLoaded
       * This method will load the storesReport from api on view load
       */
      $scope.$on('$viewContentLoaded', function() {
        //loginService.getSelectStore()
        loginService.getSelectStore()
          .then(function (response) {
            $scope.storesReport = response.data.storesReport;
            $scope.storereportlength = $scope.storesReport.length;
           // $scope.JumtoDepartment();
          });
      });

    }
    ]);	