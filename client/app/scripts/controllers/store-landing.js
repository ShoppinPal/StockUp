'use strict';

/**
 * @ngdoc function
 * @name ShoppinPalApp.controller:StoreLandingCtrl
 * @description
 * # StoreLandingCtrl
 * Controller of the ShoppinPalApp
 */
angular.module('ShoppinPalApp')
  .controller('StoreLandingCtrl', [
    '$scope', '$anchorScroll', '$location', '$state', '$filter', '$sessionStorage', /* angular's modules/services/factories etc. */
    'UserModel', 'LoopBackAuth', 'StoreModel', 'ReportModel', 'deviceDetector', /* shoppinpal's custom modules/services/factories etc. */
    'ReportModelStates', /* constants */
    function($scope, $anchorScroll, $location, $state, $filter, $sessionStorage,
             UserModel, LoopBackAuth, StoreModel, ReportModel, deviceDetector,
             ReportModelStates)
    {
      $scope.storeName = ($sessionStorage.currentStore) ? $sessionStorage.currentStore.name : null;
      $scope.roles = $sessionStorage.roles;
      $scope.ReportModelStates = ReportModelStates;

      $scope.message = 'Please Wait...';

      $scope.sortedOrder = [];
      $scope.reportLists = [];
      $scope.backUpReportList = [];
      $scope.deviceDetector = deviceDetector;
      $scope.swiping = false; // will be used as flag to prevent drill-down-to-report on ng-swipe-left

      $scope.legends = {
        'new': true,
        'inProcess': true,
        'receive': true
      };

      $scope.supplierWiseListSize = {};
      var showMoreValue = 5;

      $scope.isWarehouser = function () {
        return _.contains($scope.roles, 'admin');
      };

      $scope.isManager = function () {
        return _.contains($scope.roles, 'manager');
      };

      $scope.isReceiver = function () {
        return _.contains($scope.roles, 'manager');
      };

      /** @method onEditInit()
       * @param storeReport
       * This method is called once user choose to edit order name using right swipe
       */
      $scope.onEditInit = function(storeReport) {
        $scope.swiping = false;
        angular.element(document.querySelector('#order-name-input'))[0].focus();
        var shoppinPalMainDiv = angular.element(document.querySelector('.shoppinPal-warehouse'));
        if($scope.deviceDetector.isDesktop()) {
          shoppinPalMainDiv.bind('mousedown', function(event) {
            if( !event.target.classList.contains('editable-panel') ) {
              $scope.dismissEdit(storeReport);
              shoppinPalMainDiv.unbind('mousedown');
            }
          });
        } else {
          shoppinPalMainDiv.bind('touchstart', function(event) {
            if( !event.target.classList.contains('editable-panel') ) {
              $scope.dismissEdit(storeReport);
              shoppinPalMainDiv.unbind('touchstart');
            }
          });
        }
      };

      /** @method editOrder
       * This will edit the order name
       */
      $scope.editOrder = function(index) {
        $scope.swiping = true;
        if($scope.reportLists[index].state.toLowerCase() === 'manager') {
          $scope.selectedRowIndex = index;
        }
      };

      /** @method dismissEdit
       * This method will close the editable mode in store-report
       */
      $scope.dismissEdit = function(storeReport) {
        $scope.selectedRowIndex = $scope.storereportlength + 1; // dismiss the edit view in UI

        // update the backend
        console.log(storeReport);
        return ReportModel.prototype$updateAttributes(
          { id: storeReport.id },
          {
            name: storeReport.name
          }
        )
          .$promise.then(function(response){
            console.log('hopefully finished updating the row');
            console.log(response);
          });
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
            showInProcessOrders = false,
            showReceiveOrders = false;
        // apply filters based on the legend flag values
        angular.forEach($scope.legends, function(value, key){
          if(value) {
            if(key === 'new'){
              showNewOrders = report.state === ReportModelStates.MANAGER_NEW_ORDERS;
            } else if(key === 'inProcess') {
              showInProcessOrders = report.state === ReportModelStates.MANAGER_IN_PROCESS;
            } else if(key === 'receive') {
              showReceiveOrders = report.state === ReportModelStates.MANAGER_RECEIVE;
            }
          }
        });
        return showNewOrders || showInProcessOrders || showReceiveOrders;
      };

      /** @method filterOrders
       * method filters the orders based on the legend status
       */
      $scope.filterOrders = function() {
        $scope.reportLists = $filter('filter')($scope.backUpReportList, orderFilter);
        limitListAsPerSupplier();
      };

      /**
       * Transition to the 'create-manual-order' state
       */
      $scope.createManualOrder = function(){
        $state.go('create-manual-order');
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
        if ($scope.isManager()) {
          console.log('isManager()');
          $scope.waitOnPromise = UserModel.reportModels({id: LoopBackAuth.currentUserId})
            .$promise.then(function(response){
              $scope.reportLists = response;
              $scope.backUpReportList = response;

              // anything that isn't [MANAGER_NEW_ORDERS|MANAGER_IN_PROCESS|MANAGER_RECEIVE] gets filtered out
              $scope.filterOrders();
            });
        }
        else {
          // do nothing?
        }
      });

      var drillDownToManagerNewOrder = function(storeReport){
        $scope.waitOnPromise = ReportModel.prototype$updateAttributes(
          { id: storeReport.id },
          {
            state: ReportModelStates.MANAGER_IN_PROCESS
          }
        )
          .$promise.then(function(updatedReportModelInstance){
            console.log(updatedReportModelInstance);
            console.log('drill into manager report');
            $state.go('store-report-manager', {reportId:storeReport.id});
          });
      };

      $scope.drilldownToReport = function (rowIndex, storeReport) {
        // return if this was called by ng-swipe-left event
        if($scope.swiping) {
          $scope.swiping = false;
          return;
        }

        // drill-down-to-report if this was called by click event
        console.log('inside drilldownToReport:', 'rowIndex:', rowIndex, 'storeReport:', storeReport);
        if (_.contains($scope.roles, 'admin') &&
            storeReport.state === ReportModelStates.WAREHOUSE_FULFILL)
        {
          console.log('drill into warehouse report');
          $state.go('warehouse-report', {reportId:storeReport.id});
        }
        else if (_.contains($scope.roles, 'manager') &&
                 storeReport.state === ReportModelStates.MANAGER_NEW_ORDERS)
        {
          console.log('update report state');
          drillDownToManagerNewOrder(storeReport);
        }
        else if (_.contains($scope.roles, 'manager') &&
                 storeReport.state === ReportModelStates.MANAGER_IN_PROCESS)
        {
          console.log('drill into manager report');
          // ui-sref="store-report-manager({reportId:storeReport.id})"
          $state.go('store-report-manager', {reportId:storeReport.id});
        }
        else if (_.contains($scope.roles, 'manager') &&
                 storeReport.state === ReportModelStates.MANAGER_RECEIVE)
        {
          console.log('drill into receiver report');
          // ui-sref="store-report-manager({reportId:storeReport.id})"
          $state.go('store-receiver-report', {reportId:storeReport.id});
        }
        else if (storeReport.state === ReportModelStates.REPORT_EMPTY) {
          console.log('update status for manager report');
          // show a spinner message which indicates that we are pinging the server for a status update
          $scope.message = 'Checking report status...';

          // get an updated ReportModel with the latest task status as its property
          $scope.waitOnPromise = ReportModel.getWorkerStatus(
            {
              id: storeReport.id
            },
            function(updatedStoreReport){
              console.log(updatedStoreReport);
              // drill-down into the report automatically if the state is no longer set to empty
              if(storeReport.state === ReportModelStates.REPORT_EMPTY &&
                 updatedStoreReport.state === ReportModelStates.MANAGER_NEW_ORDERS)
              {
                // TODO: Should we bother to update the status of the report row visually first, before drilling down?
                //       Overkill?
                /*return $timeout(function() {
                  console.log('update with timeout fired');
                  return $state.go('store-report-manager', {reportId:storeReport.id});
                }, 3000);*/
                drillDownToManagerNewOrder(storeReport);
              }
              else { // update storeReport
                storeReport.state = updatedStoreReport.state;
                storeReport.workerStatus = updatedStoreReport.workerStatus;
              }
            },
            function(err){
              console.error(err);
            });
        }
        else {
          console.log('do nothing?');
        }
      };

    }
  ]);
