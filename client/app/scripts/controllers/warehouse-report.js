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
      $scope.movedToBox = [];
      $scope.boxItems= 0;
      $scope.closedboxes = [];
      $scope.index = 0;
      $scope.openBox = false;

      /** @method addNewBox
        * @description 
        * New open box added at top box status
        */
      $scope.addNewBox = function() {
        $scope.openBox = true;
      };

      $scope.closeBox = function(hidebox,itemCount){
        hidebox;
        $scope.boxItems = 0;
        $scope.openBox = false; //hide open box
        var box = 'box'+ ++$scope.index;
        var item = {'key':box, 'value':itemCount};
        $scope.closedboxes.push(item);
        console.log($scope.closedboxes);
      };
      /**
       *
       */
      $scope.moveToBox = function(storereport) {
        $scope.boxItems += 1;
        for (var i = 0; i < $scope.storesReport.length; i++) {
          if ($scope.storesReport[i].sku === storereport.sku) {
            $scope.movedToBox.push($scope.storesReport[i]); //push completed row in movedToBox array
            $scope.storesReport.splice(i, 1); //Remove the particular row from storeReports
          }
        }
        if($scope.boxItems === 10){

        }
      };

      /** @method JumtoDepartment
       * This method will return avilable departments firstChar for jumpTo department functionality
       */
      $scope.JumtoDepartment = function(){
        for (var i =0;i< $scope.storesReport.length; i++) {
          var type = $scope.storesReport[i].type,
            typefirstChar = type.slice(0, 1).toUpperCase();
          $scope.alphabets.push(typefirstChar);
        }
      };

      /** @method viewContentLoaded
       * This method will load the storesReport from api on view load
       */
      $scope.$on('$viewContentLoaded', function() {
        loginService.getSelectStore().then(function (response) {
          $scope.storesReport = response.data.storesReport;
          $scope.JumtoDepartment();
        });
      });

    }]
);
