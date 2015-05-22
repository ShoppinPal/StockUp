'use strict';

/**
 * @ngdoc function
 * @name ShoppinPalApp.controller:WarehouseReportCtrl
 * @description
 * # WarehouseReportCtrl
 * Controller of the ShoppinPalApp
 */
angular.module('ShoppinPalApp')
  .controller('WarehouseReportCtrl',['$scope','$state','loginService','$anchorScroll','$location',
    function ($scope,$state,loginService, $anchorScroll, $location){

      $scope.alphabets = [];
      $scope.movedToBox = [];
      $scope.boxItems= 0;
      $scope.closedboxes = [];
      $scope.index = 0;
      $scope.openBox = true;
      $scope.submit = 'Review';
      $scope.closeBoxButtonLabel = 'CLOSE THIS BOX';
      $scope.printSlipButtonLabel = 'PRINT PACKING SLIP';
      $scope.ReviewSubmitPage = true;

     /** @method dismissEdit
       * This method will close the editable mode in store-report
       */
      $scope.dismissEdit =function(){
        $scope.selectedRowIndex  = $scope.storereportlength + 1;
      };

     /** @method printDiv
       * @param divName
       * Print packging slip
       */
      $scope.printSlip = function(divName) {
        var printContents = document.getElementById(divName).innerHTML;
        var popupWin = window.open('', '_blank', 'width=300,height=300');
        popupWin.document.open();
        popupWin.document.write('<html><head><link rel="stylesheet" type="text/css" href="style.css" /></head><body onload="window.print()">' + printContents + '</html>');
        popupWin.document.close();
      };
      
    /** @method submitToReceiver
      * Submit the wharehouse page to receiver
      */
      $scope.submitToReceiver = function() {
        $scope.submit = 'Submit';
        $scope.ReviewSubmitPage = false;
      };

      /** @method addNewBox
       * @description
       * New open box added at top box status
       */
      $scope.addNewBox = function() {
        $scope.openBox = true;
      };

      /** @method closeBox
       * This will close the box
       */
      $scope.closeBox = function(hidebox,itemCount){
        hidebox; // jshint ignore:line
        $scope.boxItems = 0;
        $scope.openBox = false; //hide open box
        $scope.index++;
        var box = 'box'+ $scope.index;
        var item = {'key':box, 'value':itemCount};
        $scope.closedboxes.push(item);
        console.log($scope.closedboxes);
      };
      /**
       *
       */
      $scope.moveToBox = function(storereport) {
        if($scope.openBox){
          $scope.boxItems += 1;
          for (var i = 0; i < $scope.storesReport.length; i++) {
            if ($scope.storesReport[i].sku === storereport.sku) {
              $scope.movedToBox.push($scope.storesReport[i]); //push completed row in movedToBox array
              $scope.storesReport.splice(i, 1); //Remove the particular row from storeReports
            }
          }
        }
      };

      /** @method editWarehouse
       * @param store
       * enable the edit mode in UI
       */
      $scope.editWarehouse = function(selectedRow) {
        $scope.selectedRowIndex = selectedRow;
      };

      /** @method decreaseQty
       * @param storeReport
       * This method decreases the desiredStockLevel quantity ,when user tap on '-'' sign
       */
      $scope.decreaseQty = function(storeReport) {
        storeReport.desiredStockLevel = parseInt(storeReport.desiredStockLevel); // parse it from string to integer
        if(storeReport.desiredStockLevel >0){
          storeReport.desiredStockLevel -= 1;
        }
      };

      /** @method increaseQty
       * @param storeReport
       * This method increase the desiredStockLevel quantity ,when user tap on '+' sign
       */
      $scope.increaseQty = function(storeReport) {
        storeReport.desiredStockLevel = parseInt(storeReport.desiredStockLevel);
        storeReport.desiredStockLevel += 1;
      };


      /** @method gotoDepartment
       * @param value
       * This method
       */
      $scope.gotoDepartment = function(value) {
        var jumpToHash;
        if (value) {
          for (var i = 0; i < $scope.storesReport.length; i++) {
            var type = $scope.storesReport[i].type,
                typefirstChar = type.slice(0, 1).toUpperCase();
            $scope.alphabets.push(typefirstChar);
            if (typefirstChar === value) {
              jumpToHash = 'jumpto' + $scope.storesReport[i].type;
            }
          }

        }
        $location.hash(jumpToHash);
        $anchorScroll();
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
          $scope.storesReport = response;
          $scope.JumtoDepartment();
        });
      });

    }]
);
