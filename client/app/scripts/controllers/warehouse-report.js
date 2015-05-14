'use strict';

/**
 * @ngdoc function
 * @name ShoppinPalApp.controller:WarehouseReportCtrl
 * @description
 * # WarehouseReportCtrl
 * Controller of the ShoppinPalApp
 */
angular.module('ShoppinPalApp')
  .controller('WarehouseReportCtrl',['$scope','$document','$state','loginService','$anchorScroll','$location',
    function ($scope,$document,$state,loginService, $anchorScroll, $location){

      $scope.alphabets = [];
      $scope.movedToBox = [];
      $scope.boxItems= 0;
      $scope.closedboxes = [];
      $scope.index = 0;
      $scope.openBox = true;
      $scope.submit = 'Review & Submit';
      $scope.closeBoxButtonLabel = 'CLOSE THIS BOX';
      $scope.printSlipButtonLabel = 'PRINT PACKING SLIP';
      
      /** This method will close the editable mode in store-report
        */
      $document.on('click', function(event) {
        if (angular.element(event.target).hasClass('shoppinPal-warehouse')) {
          $scope.selectedStore  = $scope.storereportlength + 1;
          $scope.$apply();
        }
      });

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
        $scope.selectedStore = selectedRow;
      };

      /** @method decreaseQty
       * @param storereport
       * This method decreases the desiredStockLevel quantity ,when user tap on '-'' sign
       */
      $scope.decreaseQty = function(storereport) {
        storereport.desiredStockLevel = parseInt(storereport.desiredStockLevel); // parse it from string to integer
        if(storereport.desiredStockLevel >0){
          storereport.desiredStockLevel -= 1;
        }
      };

      /** @method increaseQty
       * @param storereport
       * This method increase the desiredStockLevel quantity ,when user tap on '+' sign
       */
      $scope.increaseQty = function(storereport) {
        storereport.desiredStockLevel = parseInt(storereport.desiredStockLevel);
        storereport.desiredStockLevel += 1;
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
          $scope.storesReport = response.data.storesReport;
          $scope.JumtoDepartment();
        });
      });

    }]
);
