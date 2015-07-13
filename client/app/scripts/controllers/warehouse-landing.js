'use strict';

/**
 * @ngdoc function
 * @name ShoppinPalApp.controller:WarehouseLandingCtrl
 * @description
 * # WarehouseLandingCtrl
 * Controller of the ShoppinPalApp
 */
angular.module('ShoppinPalApp')
  .controller('WarehouseLandingCtrl', [
    '$scope', '$state', '$anchorScroll', '$location', '$sessionStorage',
    'loginService', 'ReportModel', '$filter',
    function($scope, $state, $anchorScroll, $location, $sessionStorage,
             loginService, ReportModel, $filter)
    {
      $scope.roles = $sessionStorage.roles;

      $scope.sortedOrder = [];

      $scope.legends = {
        'warehouse': true,
        'fulfill':   true,
        'receive':   true
      };

      /** @method dismissEdit
       * This method will close the editable mode in store-report
       */
      $scope.dismissEdit = function() {
        $scope.selectedRowIndex = $scope.storereportlength + 1;
      };

      /** @method createManualOrder
       * it will allow the warehouse manager to create manual order
       */
      $scope.createManualOrder = function() {
        $state.go('create-manual-order');
      };

      /** @method inProcessOrder
       * show only the inprocess order in UI
       */
      $scope.inProcessOrder = function() {
        $scope.sortedOrder = [];
        for (var i = 0; i < $scope.storesReportBackupLength - 1; i++) {
          if ($scope.storesReportBackup[i].status === 'inProgress') {
            $scope.sortedOrder.push($scope.storesReportBackup[i]);
          }
        }
        $scope.storesReport = [];
        $scope.storesReport = $scope.sortedOrder;
      };

      /** @method fulfilledOrder
       * show all fullfilled order
       */
      $scope.fulfilledOrder = function() {
        $scope.sortedOrder = [];
        for (var i = 0; i < $scope.storesReportBackupLength - 1; i++) {
          if ($scope.storesReportBackup[i].status === 'pending') {
            $scope.sortedOrder.push($scope.storesReportBackup[i]);
          }
        }
        $scope.storesReport = [];
        $scope.storesReport = $scope.sortedOrder;
      };

      /** @method recievedOrder
       * show all recieved order
       */
      $scope.recievedOrder = function() {
        $scope.sortedOrder = [];
        for (var i = 0; i < $scope.storesReportBackupLength - 1; i++) {
          if ($scope.storesReportBackup[i].status === 'complete') {
            $scope.sortedOrder.push($scope.storesReportBackup[i]);
          }
        }
        $scope.storesReport = [];
        $scope.storesReport = $scope.sortedOrder;
      };

      var orderFilter = function(report){
        var showWarehouseOrders = false,
            showFulfillOrders = false,
            showReceiveOrders = false;
        // apply filters based on the legend flag values
        angular.forEach($scope.legends, function(value, key){
          if(value) {
            if(key === 'warehouse'){
              showWarehouseOrders = report.state === key;
            } else if(key === 'fulfill') {
              showFulfillOrders = report.state === key;
            } else if(key === 'receive') {
              showReceiveOrders = report.state === key;
            }
          }
        });
        return showWarehouseOrders || showFulfillOrders || showReceiveOrders;
      };

      /** @method filterOrders
       * method filters the orders based on the legend status
       */
      $scope.filterOrders = function() {
        $scope.reportLists = $filter('filter')($scope.backUpReportList, orderFilter);
      };

      /** @method importExport
       * @param index
       * on left swipe of store landing page enable export, import for warehouse
       */
      $scope.importExport = function(index) {
        $scope.selectedRowIndex = index;
      };

      /** @method gotoDepartment
       * @param value
       * This method
       */
      $scope.gotoDepartment = function(value) {
        var jumpToHash = 'jumpto' + value;
        $location.hash(jumpToHash);
        $anchorScroll();
      };

      /** @method viewContentLoaded
       * This method will load the storesReport from api on view load
       */
      $scope.$on('$viewContentLoaded', function() {
        $scope.waitOnPromise = ReportModel.find()
          .$promise.then(function (response) {
            //console.log(response);
            $scope.reportLists = response;
            $scope.backUpReportList = response;
          });
      });

      $scope.drilldownToReport = function (rowIndex, storeReport) {
        // NOTE: warehouser (admin role) is allowed to do anything!
        console.log('inside drilldownToReport:', 'rowIndex:', rowIndex, 'storeReport:', storeReport);
        if (_.contains($scope.roles, 'admin')){
          if (storeReport.state === 'warehouse') {
            console.log('drill into warehouse report');
            $state.go('warehouse-report', {reportId:storeReport.id});
          }
          else {
            console.log('do nothing?');
          }
        }
        else {
          $state.go('logout');
        }
      };
    }
  ]);
