'use strict';
/**
 * @ngdoc function
 * @name ShoppinPalApp.controller:StoreManagerCtrl
 * @description
 * # StoreManagerCtrl
 * Controller of the ShoppinPalApp
 */
angular.module('ShoppinPalApp')
  .controller('StoreManagerCtrl',
  [
    '$scope','$document', '$anchorScroll', '$location', 'loginService', '$stateParams',
    function ($scope,$document, $anchorScroll, $location, loginService, $stateParams)
    {

    $anchorScroll.yOffset = 50;
    $scope.storesReport = [];
    $scope.completedReports = [];
    $scope.alphabets = [];
    $scope.submitToWarehouseButton = 'Review & Submit';
    $scope.comments = '';

      /** This method will close the editable mode in store-report
       */
      $document.on('click', function(event) {
        if (angular.element(event.target).hasClass('shoppinPal-warehouse')) {
          $scope.selectedStore  = $scope.storereportlength + 1;
          $scope.$apply();
        }
      });

      /** @method editStore()
       * @param selecte_row
       * This method display the edit functionlity on right swipe
       */
      $scope.editStore = function(selectedRow) {
        $scope.selectedStore = selectedRow;
      };

      /** @method deleteStore
       * @param storereport
       * This method remove the row from store-report on left swipe
       */
      $scope.deleteStore = function(storereport) {
        for (var i = 0; i < $scope.storesReport.length; i++) {
          if ($scope.storesReport[i].sku === storereport.sku) {
            $scope.completedReports.push($scope.storesReport[i]); //push completed row in completedReports array
            $scope.storesReport.splice(i, 1); //Remove the particular row from storeReports
          }
        }
      };

      /** @method gotoDepartment
       * @param value
       * This method
       */
      $scope.gotoDepartment = function(value) {
        var jumpToHash = 'jumpto' + 'electronics';
        for (var i = 0; i < $scope.storesReport.length; i++) {
          var type = $scope.storesReport[i].type,
            typefirstChar = type.slice(0, 1).toUpperCase();
          $scope.alphabets.push(typefirstChar);
          if (typefirstChar === value) {
            jumpToHash = 'jumpto' + $scope.storesReport[i].type;
          }
        }
        if ($location.hash() !== jumpToHash) {
          $location.hash(jumpToHash);
        }
        else {
          $anchorScroll();
        }
      };

      /** @method JumtoDepartment
       * This method will return avilable departments firstChar for jumpTo department functionality
       */
      $scope.JumtoDepartment = function() {
        for (var i = 0; i < $scope.storesReport.length; i++) {
          var type = $scope.storesReport[i].type,
            typefirstChar = type.slice(0, 1).toUpperCase();
          $scope.alphabets.push(typefirstChar);
        }
      };
    /** @method showCompletedReport
     * This display completed report on screen
     */
    $scope.showCompletedReport = function() {
      $scope.storesReport = $scope.completedReports;
    };
      /** @method submitToWarehouse
       * This method will submit the store-report to warehouse
       */
      $scope.submitToWarehouse = function() {
        $location.path('/warehouse-report');
      };

      /** @method decreaseQty
       * @param storereport
       * This method decreases the ordered quantity ,when user tap on '-'' sign
       */
      $scope.decreaseQty = function(storereport) {
        storereport.orderqty = parseInt(storereport.orderqty); // parse it from string to integer
        if(storereport.orderqty >0){
          storereport.orderqty -= 1;
        } 
      };

      /** @method increaseQty
       * @param storereport
       * This method increase the ordered quantity ,when user tap on '+' sign
       */
      $scope.increaseQty = function(storereport) {
        storereport.orderqty = parseInt(storereport.orderqty);
        storereport.orderqty += 1;
      };

      /** @method hideEdit
       *
       */
      $scope.hideEdit = function () {
        //alert("hii");
        if ($scope.editVisible) {
          $scope.editVisible = false;
        }
      };
      /** @method viewContentLoaded
       * This method will load the storesReport from api on view load
       */
      $scope.$on('$viewContentLoaded', function() {
        //loginService.getSelectStore()
        loginService.getSelectStore($stateParams.reportId)
          .then(function (response) {
            $scope.storesReport = response;
            $scope.storereportlength = $scope.storesReport.length;
            $scope.JumtoDepartment();
          });
      });
    }
  ]);
