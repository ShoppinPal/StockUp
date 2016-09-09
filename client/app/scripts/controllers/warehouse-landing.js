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
    '$scope', '$state', '$anchorScroll', '$location', '$sessionStorage', '$filter', /* angular's modules/services/factories etc. */
    'loginService', 'uiUtils', 'ReportModel', /* shoppinpal's custom modules/services/factories etc. */
    'ReportModelStates', /* constants */
    function($scope, $state, $anchorScroll, $location, $sessionStorage, $filter,
             loginService, uiUtils, ReportModel,
             ReportModelStates)
    {
      $scope.roles = $sessionStorage.roles;
      $scope.ReportModelStates = ReportModelStates;

      $scope.sortedOrder = [];

      $scope.legends = {
        'inProcess': true,
        'fulfill': true,
        'receive':   true
      };

      $scope.currentSupplier = '';
      $scope.supplierWiseListSize = {};
      $scope.showMoreValue = 5;

      // TODO: should be methods of an injectable service
      $scope.isWarehouser = function () {
        return _.contains($scope.roles, 'admin');
      };
      $scope.isManager = function () {
        return _.contains($scope.roles, 'manager');
      };
      $scope.isReceiver = function () {
        return _.contains($scope.roles, 'manager');
      };

      /** @method dismissEdit
       * This method will close the editable mode in store-report
       */
      $scope.dismissEdit = function() {
        $scope.selectedRowIndex = $scope.storereportlength + 1;
      };

      /** @method showMore
       * increase the list display size for a specific supplier
       */
      $scope.showMore = function(supplier) {
        $scope.supplierWiseListSize[supplier].size += $scope.showMoreValue;
        uiUtils.limitListAsPerSupplier($scope);
      };

      /** @method orderFilter
       * filter orders based on the report state
       */
      var orderFilter = function(report){
        var showInProcessOrders = false,
            showFulfillOrders = false,
            showReceiveOrders = false;
        // apply filters based on the legend flag values
        angular.forEach($scope.legends, function(value, key){
          if(value) {
            if(key === 'inProcess'){
              showInProcessOrders = report.state === ReportModelStates.MANAGER_IN_PROCESS;
            } else if(key === 'fulfill') {
              showFulfillOrders = report.state === ReportModelStates.WAREHOUSE_FULFILL;
            } else if(key === 'receive') {
              showReceiveOrders = report.state === ReportModelStates.MANAGER_RECEIVE;
            }
          }
        });
        return showInProcessOrders || showFulfillOrders || showReceiveOrders;
      };

      /** @method filterOrders
       * method filters the orders based on the legend status
       */
      $scope.filterOrders = function() {
        $scope.reportLists = $filter('filter')($scope.backUpReportList, orderFilter);
        uiUtils.limitListAsPerSupplier($scope);
      };

      /** @method createManualOrder
       * it will allow the warehouse manager to create manual order
       */
      $scope.createManualOrder = function() {
        $state.go('create-manual-order');
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
        if ($scope.isWarehouser()) {
          console.log('isWarehouser()');
          $scope.waitOnPromise = ReportModel.find()
            .$promise.then(function (response) {
              //console.log(response);
              $scope.reportLists = response;
              $scope.backUpReportList = response;

              // anything that isn't [MANAGER_IN_PROCESS|WAREHOUSE_FULFILL|MANAGER_RECEIVE] gets filtered out
              $scope.filterOrders();
            });
        }
        else {
          // do nothing?
        }
      });

      $scope.drilldownToReport = function (rowIndex, storeReport) {
        // NOTE: warehouser (admin role) is allowed to do anything!
        console.log('inside drilldownToReport:', 'rowIndex:', rowIndex, 'storeReport:', storeReport);
        if (_.contains($scope.roles, 'admin')){
          if (storeReport.state === ReportModelStates.WAREHOUSE_FULFILL) {
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

      $scope.delete = function(rowIndex, reportId) {
        console.log('delete > reportId:', reportId);
        if ($scope.isWarehouser()) {
          console.log('delete > isWarehouser()');
          //$scope.waitOnPromise = ReportModel.remove({
          $scope.waitOnPromise = ReportModel.removeReport({
            id: reportId
          })
            .$promise.then(function (response) {
              console.log('delete > done:', response);
              $scope.dismissEdit();
              $scope.backUpReportList.splice(rowIndex, 1);
              $scope.filterOrders();
            });
        }
        else {
          // do nothing?
        }
      };

    }
  ]);
