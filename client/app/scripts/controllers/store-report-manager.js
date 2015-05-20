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
    '$scope', '$anchorScroll', '$location', 'loginService', '$stateParams',
    'StockOrderLineitemModel','$filter',
    function ($scope, $anchorScroll, $location, loginService, $stateParams, StockOrderLineitemModel, $filter)
    {

      $anchorScroll.yOffset = 50;
      $scope.storesReport = [];
      $scope.completedReports = [];
      $scope.alphabets = [];
      $scope.submitToWarehouseButton = 'Review';
      $scope.comments = '';
      $scope.ReviewSubmitPage = true;

      /** @method dismissEdit
       * This method will close the editable mode in store-report
       */
      $scope.dismissEdit = function(storeReportRow) {
        $scope.selectedRowIndex = $scope.storereportlength + 1;
        console.log({
          desiredStockLevel: storeReportRow.desiredStockLevel,
          orderQuantity: storeReportRow.orderQuantity,
          comment: storeReportRow.comment
        });
        // TODO: why not use the SKU field as the id?
        return StockOrderLineitemModel.prototype$updateAttributes(
          { id: storeReportRow.id },
          {
            desiredStockLevel: storeReportRow.desiredStockLevel,
            orderQuantity: storeReportRow.orderQuantity,
            comment: storeReportRow.comment
          }
        )
          .$promise.then(function(response){
            console.log('hopefully finished updating the row');
            console.log(response);
          });
      };

      /** @method editStore()
       * @param selectedRow
       * This method display the edit functionlity on right swipe
       */
      $scope.editStore = function(selectedRow) {
        $scope.selectedRowIndex = selectedRow;
      };

      /** @method markRowAsCompleted
       * @param storereport
       * This method remove the row from store-report on left swipe
       */
      $scope.markRowAsCompleted = function(storeReportRow) {
        for (var i = 0; i < $scope.storesReport.length; i++) {
          if ($scope.storesReport[i].sku === storeReportRow.sku) {
            $scope.completedReports.push($scope.storesReport[i]); //push completed row in completedReports array
            $scope.storesReport.splice(i, 1); //Remove the particular row from storeReports
          }
        }
        // TODO: why not use the SKU field as the id?
        return StockOrderLineitemModel.prototype$updateAttributes(
          { id: storeReportRow.id },
          {
            state: 'complete',
          }
        )
          .$promise.then(function(response){
            console.log('hopefully finished updating the row');
            console.log(response);
          });
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
          loginService.getStoreReport($stateParams.reportId)
            .then(function (response) {
              $scope.storesReport = response;
              $scope.storesReport = $filter('filter')($scope.storesReport, { state: 'complete' });
            });
        };
      /** @method submitToWarehouse
       * This method will submit the store-report to warehouse
       */
      $scope.submitToWarehouse = function() {
        $scope.submitToWarehouseButton = 'Submit';
        if(!$scope.ReviewSubmitPage){
          $location.path('/warehouse-report');
        }
        else{
          $scope.ReviewSubmitPage = false;
        }
      };

      /** @method decreaseQty
       * @param storereport
       * This method decreases the ordered quantity ,when user tap on '-'' sign
       */
      $scope.decreaseQty = function(storereport) {
        storereport.orderQuantity = parseInt(storereport.orderQuantity); // parse it from string to integer
        if(storereport.orderQuantity >0){
          storereport.orderQuantity -= 1;
        }
      };

      /** @method increaseQty
       * @param storereport
       * This method increase the ordered quantity ,when user tap on '+' sign
       */
      $scope.increaseQty = function(storereport) {
        storereport.orderQuantity = parseInt(storereport.orderQuantity);
        storereport.orderQuantity += 1;
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
        if($stateParams.reportId) {
          loginService.getStoreReport($stateParams.reportId)
            .then(function (response) {
              $scope.storesReport = response;
              $scope.storereportlength = $scope.storesReport.length;
              $scope.JumtoDepartment();
            });
        }
        else { // if live data can't be loaded due to some bug, use MOCK data so testing can go on
          loginService.getSelectStore()
            .then(function (response) {
              $scope.storesReport = response;
              $scope.storereportlength = $scope.storesReport.length;
              $scope.JumtoDepartment();
            });
        }
      });
    }
  ]);
