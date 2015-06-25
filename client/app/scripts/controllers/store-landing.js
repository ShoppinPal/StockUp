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
    function($scope, $anchorScroll, $location, $state, $filter, $sessionStorage,
             UserModel, LoopBackAuth, StoreModel, ReportModel, deviceDetector)
    {
      $scope.storeName = ($sessionStorage.currentStore) ? $sessionStorage.currentStore.name : null;
      $scope.roles = $sessionStorage.roles;

      $scope.message = 'Please Wait...';

      $scope.sortedOrder = [];
      $scope.reportLists = [];
      $scope.backUpReportList = [];
      $scope.deviceDetector = deviceDetector;

      /** @method onEditInit()
       * @param storeReport
       * This method is called once user choose to edit order name using right swipe
       */
      $scope.onEditInit = function(storeReport) {
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
        $scope.selectedRowIndex = index;
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

      var newOrdersFilter = function(report) {
        return report.state === 'empty' || report.state === 'manager';
      };

      /** @method newOrders
       * show all newOrders
       */
      $scope.newOrders = function() {
        $scope.reportLists = $filter('filter')($scope.backUpReportList, newOrdersFilter);
      };

      /** @method inProcessOrder
       * show only the inprocess order in UI
       */
      $scope.inProcessOrder = function() {
        $scope.reportLists = $filter('filter')($scope.backUpReportList, {state: 'warehouse'});
      };

      /** @method recievedOrder
       * show all recieved order
       */
      $scope.recievedOrder = function() {
        $scope.reportLists = $filter('filter')($scope.backUpReportList, {state: 'receive'});
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
        $scope.waitOnPromise = UserModel.reportModels({id: LoopBackAuth.currentUserId})
          .$promise.then(function(response){
            $scope.reportLists = response;
            $scope.backUpReportList = response;
          });
      });

      $scope.drilldownToReport = function (rowIndex, storeReport) {
        console.log('inside drilldownToReport:', 'rowIndex:', rowIndex, 'storeReport:', storeReport);
        if (_.contains($scope.roles, 'admin') && storeReport.state === 'warehouse') {
          console.log('drill into warehouse report');
          $state.go('warehouse-report', {reportId:storeReport.id});
        }
        else if (_.contains($scope.roles, 'manager') && storeReport.state !== 'warehouse' && storeReport.state !== 'empty' ) {
          console.log('drill into manager report');
          // ui-sref="store-report-manager({reportId:storeReport.id})"
          $state.go('store-report-manager', {reportId:storeReport.id});
        }
        else if (storeReport.state === 'empty' ) {
          console.log('update status for manager report');
          // show a spinner message which indicates that we are pinging the server for a status update
          $scope.message = 'Checking report status...';

          // get an updated ReportModel with the latest task status as its property
          $scope.waitOnPromise = ReportModel.getWorkerStatus(
            {
              id: storeReport.id
            },
            function(response){
              console.log(response);
              // drill-down into the report automatically if the state is no longer set to empty
              if(storeReport.state === 'empty' && response.state === 'manager') {
                // TODO: Should we bother to update the status of the report row visually first, before drilling down?
                //       Overkill?
                /*return $timeout(function() {
                  console.log('update with timeout fired');
                  return $state.go('store-report-manager', {reportId:storeReport.id});
                }, 3000);*/
                return $state.go('store-report-manager', {reportId:storeReport.id});
              }
              else { // update storeReport
                storeReport.state = response.state;
                storeReport.workerStatus = response.workerStatus;
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
