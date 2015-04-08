'use strict';

/**
 * @ngdoc function
 * @name ShoppinPalApp.controller:WarehouseReportCtrl
 * @description
 * # WarehouseReportCtrl
 * Controller of the ShoppinPalApp
 */
angular.module('ShoppinPalApp')
  .controller('WarehouseReportCtrl',['$scope','$state','loginService',
    function ($scope,$state,loginService){

     $scope.alphabets = []; 

    /** @method JumtoDepartment
      * This method will return avilable departments firstChar for jumpTo department functionality
      */
    $scope.JumtoDepartment = function(){
        for (var i =0;i< $scope.storesReport.length; i++) {
             var type = $scope.storesReport[i].type,
                 typefirstChar = type.slice(0, 1).toUpperCase();
                 $scope.alphabets.push(typefirstChar);
                 $.unique($scope.alphabets); // This method remove the duplicates from array
            }   
    };

    /** @method viewContentLoaded
      * This method will load the storesReport from api on view load
      */
    $scope.$on('$viewContentLoaded', function() {
      loginService.getStoreReport().then(function (response) {
            $scope.storesReport = response.data.storesReport;
            $scope.JumtoDepartment();
        });
    });

  }]
);
