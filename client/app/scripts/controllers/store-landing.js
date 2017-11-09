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
    'uiUtils','UserModel', 'LoopBackAuth', 'StoreModel', 'ReportModel', /* shoppinpal's custom modules/services/factories etc. */
    'deviceDetector', 'ngDialog', 'Notification', /* 3rd party modules/services/factories etc. */
    'ReportModelStates', /* constants */
    function($scope, $anchorScroll, $location, $state, $filter, $sessionStorage,
             uiUtils, UserModel, LoopBackAuth, StoreModel, ReportModel,
             deviceDetector, ngDialog, Notification,
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
      $scope.editOrder = function(index, storeReport) {
        // TODO: @ayush - the output of the following two log statements is inconsistent,
        //                that means we may be making a mistake here if we use the value based on index
        /*console.log('$scope.reportLists[index].state.toLowerCase()', $scope.reportLists[index].state.toLowerCase());
        console.log('storeReport.state.toLowerCase()', storeReport.state.toLowerCase());*/

        $scope.swiping = true;
        if(storeReport.state.toLowerCase() === ReportModelStates.MANAGER_NEW_ORDERS) {
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
        var showEmptyOrders = report.state === ReportModelStates.REPORT_EMPTY;
        return showEmptyOrders || showNewOrders || showInProcessOrders || showReceiveOrders;
      };

      /** @method filterOrders
       * method filters the orders based on the legend status
       */
      $scope.filterOrders = function() {
        $scope.reportLists = $filter('filter')($scope.backUpReportList, orderFilter);
        uiUtils.limitListAsPerSupplier($scope);
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

              // anything that isn't [REPORT_EMPTY|MANAGER_NEW_ORDERS|MANAGER_IN_PROCESS|MANAGER_RECEIVE] gets filtered out
              $scope.filterOrders();
            });
        }
        else {
          // do nothing?
        }
      });

      var promptManagerToNameTheReport = function() {
        var dialog = ngDialog.open({
          template: 'views/popup/nameTheReport.html',
          className: 'ngdialog-theme-plain',
          scope: $scope
        });
        dialog.closePromise.then(function (data) {
          var proceed = data.value;
          if (proceed) {
            console.log('User knows that they should name the report now');
          }
        });
      };

      var drillDownToManagerNewOrder = function(storeReport){
        // make sure the name is set so that we can create a matching consignment in Vend
        if (storeReport.name) { // TODO: duplicate this validation logic on server-side as well
          // server-side will edit the report's state and create a matching consignment in Vend
          $scope.waitOnPromise = ReportModel.setReportStatus({
            id: storeReport.id,
            from: ReportModelStates.MANAGER_NEW_ORDERS,
            to: ReportModelStates.MANAGER_IN_PROCESS
          })
            .$promise.then(function(){
              console.log('drill into manager report');
              $state.go('store-report-manager', {reportId:storeReport.id});
            });
        }
        else {
          promptManagerToNameTheReport();
        }
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
   
      if ($scope.socket) {
        console.log('Fetching pending notifications...');
        $scope.socket.send(JSON.stringify({event: 'USER_FETCH_NOTIFICATION_HISTORY', payload: {}, userId: $sessionStorage.currentUser.userId}));
      }
      $scope.socket.setHandler('message', function(event) {
        console.log('Inside warehouse landing message event', event.data);

        try{
          var notif = JSON.parse(event.data);

          switch (notif.event) {

            case 'NOTIFICATION_HISTORY':
              let ids = [];
              notif.notifications.forEach((notif) => {
                  ids.push(notif._id);
                  notifyMe(notif);
              });
              $scope.socket.send(JSON.stringify({event: 'NOTIFICATION_BULK_RECEIVED_ACK', payload: {}, messageIds: ids, userId: $sessionStorage.currentUser.userId}));
              
            break;

            case 'WORKER_NOTIFICATION':
              notifyMe(notif);
              $scope.socket.send(JSON.stringify({event: 'NOTIFICATION_RECEIVED_ACK', messageId: notif._id, payload: {}, userId: $sessionStorage.currentUser.userId}));
              console.log('notification ack sent');
            break;

            case 'NOTIFICATION_HISTORY_EMPTY':
              console.log('Up to date with notifications. Make api call to fetch archived notifications in the next step');
            break;

            case 'MESSAGES_DELETED':
            
            break;
            
            case 'BULK_MESSAGES_DELETED':
            
            break;

            default:
              console.log('Unknown Event');
            break;
          }

          function notifyMe (notif) {
            Notification.success({
              message: notif.payload.message,
              onClose: function() {
                return $state.go($state.current, {}, {reload: true}); // $stateParams isn't injected, therefore not reused
              }
            });
          }
        }catch(error) {
          console.log(error);
        }
        
      });

    }
  ]);
