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

      $scope.supplierWiseListSize = {};
      var showMoreValue = 5;

      /** @method dismissEdit
       * This method will close the editable mode in store-report
       */
      $scope.dismissEdit = function() {
        $scope.selectedRowIndex = $scope.storereportlength + 1;
      };

      var currentSupplier = '';

      /** @method supplierFilter
       * filter orders based on supplier
       */
      var supplierFilter = function(report) {
        return report.supplier.name === currentSupplier;
      };

      /** @method limitListAsPerSupplier
       * creates filtered list based on individual supplier limit size
       */
      var limitListAsPerSupplier = function(){
        var suppliers = [];
        // extract all the suppliers through out the reports list
        angular.forEach($scope.reportLists, function(report) {
          if(suppliers.indexOf(report.supplier.name) < 0) {
            suppliers.push(report.supplier.name);
            if(!$scope.supplierWiseListSize[report.supplier.name]) {
              // set the list size per supplier, for show more feature
              $scope.supplierWiseListSize[report.supplier.name] = {size: showMoreValue, enabled: true};
            }
          }
        });

        var filteredLists = [];
        // find the supplier wise list limited to the list size value
        angular.forEach($scope.supplierWiseListSize, function(supplier, key) {
          // filter based on current supplier eg: CSC
          currentSupplier = key;
          var array = $filter('filter')($scope.reportLists, supplierFilter);
          // disable show more link (for individual supplier) if there is no more item to show
          if(array.length <= supplier.size) {
            supplier.enabled = false;
          } else {
            supplier.enabled = true;
          }
          // filter based on the supplier list size
          array = $filter('limitTo')(array, supplier.size);
          angular.forEach(array, function(report) {
            filteredLists.push(report);
          });
        });
        $scope.filteredLists = angular.copy(filteredLists);
      };

      /** @method showMore
       * increase the list display size for a specific supplier
       */
      $scope.showMore = function(supplier) {
        $scope.supplierWiseListSize[supplier].size += showMoreValue;
        limitListAsPerSupplier();
      };

      /** @method orderFilter
       * filter orders based on the report state
       */
      var orderFilter = function(report){
        var showNewOrders = false,
            showWarehouseOrders = false,
            showReceiveOrders = false;
        // apply filters based on the legend flag values
        angular.forEach($scope.legends, function(value, key){
          if(value) {
            if(key === 'new'){
              showNewOrders = report.state === 'empty' || report.state === 'manager';
            } else if(key === 'warehouse') {
              showWarehouseOrders = report.state === key;
            } else if(key === 'receive') {
              showReceiveOrders = report.state === key;
            }
          }
        });
        return showNewOrders || showWarehouseOrders || showReceiveOrders;
      };

      /** @method filterOrders
       * method filters the orders based on the legend status
       */
      $scope.filterOrders = function() {
        $scope.reportLists = $filter('filter')($scope.backUpReportList, orderFilter);
        limitListAsPerSupplier();
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
        $scope.waitOnPromise = ReportModel.find()
          .$promise.then(function (response) {
            //console.log(response);
            $scope.reportLists = response;
            $scope.backUpReportList = response;
            limitListAsPerSupplier();
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
