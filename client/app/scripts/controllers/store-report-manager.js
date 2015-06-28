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
    '$scope', '$anchorScroll', '$location', '$state', '$stateParams', '$filter', '$sessionStorage', /* angular's modules/services/factories etc. */
    'loginService', 'StockOrderLineitemModel', 'ReportModel', /* shoppinpal's custom modules/services/factories etc. */
    'ngDialog', 'deviceDetector', /* 3rd party modules/services/factories etc. */
    function ($scope, $anchorScroll, $location, $state, $stateParams, $filter, $sessionStorage,
              loginService, StockOrderLineitemModel, ReportModel,
              ngDialog, deviceDetector)
    {
      var ROW_STATE_NOT_COMPLETE = '!complete';
      var ROW_STATE_COMPLETE = 'complete';
      var originalReportDataSet; // no need to put everything in the $scope, only what's needed

      $scope.storeName = ($sessionStorage.currentStore) ? $sessionStorage.currentStore.name : null;

      $anchorScroll.yOffset = 50;
      $scope.storesReport = [];
      $scope.completedReports = [];
      $scope.alphabets = [];
      $scope.submitToWarehouseButton = 'Submit';
      $scope.comments = '';
      $scope.deviceDetector = deviceDetector;

      /** @method dismissEdit
       * This method will close the editable mode in store-report
       */
      $scope.dismissEdit = function(storeReportRow) {
        // update the backend
        /*console.log({
          desiredStockLevel: storeReportRow.desiredStockLevel,
          orderQuantity: storeReportRow.orderQuantity,
          comment: storeReportRow.comment
        });*/
        $scope.waitOnPromise = StockOrderLineitemModel.prototype$updateAttributes(
          { id: storeReportRow.id },
          {
            desiredStockLevel: storeReportRow.desiredStockLevel,
            orderQuantity: storeReportRow.orderQuantity,
            comment: storeReportRow.comment
          }
        )
          .$promise.then(function(response){
            storeReportRow.updatedAt = response.updatedAt;
            $scope.selectedRowIndex = $scope.storereportlength + 1; // dismiss the edit view in UI
          });
      };

      /** @method editRow()
       * @param selectedRow
       * This method display the edit functionality on right swipe
       */
      $scope.editRow = function(selectedRow) {
        $scope.selectedRowIndex = selectedRow;
      };

      /** @method onEditInit()
       * @param storeReportRow
       * This method is called once user choose to edit a row using right swipe
       */
      $scope.onEditInit = function(storeReportRow) {
        /* moved the event from body to ui-view div as after adding the virtual keyboard,
           clicking on anywhere on keyboard will dismiss the edit box*/
        //var body = angular.element(document).find('body');
        var shoppinPalMainDiv = angular.element(document.querySelector('.shoppinPal-warehouse'));
        if($scope.deviceDetector.isDesktop()) {
          //body.bind('mousedown', function(event) {
          shoppinPalMainDiv.bind('mousedown', function(event) {
            if( !event.target.classList.contains('editable-panel') ) {
              $scope.dismissEdit(storeReportRow);
              //body.unbind('mousedown');
              shoppinPalMainDiv.unbind('mousedown');
            }
          });
        } else {
          //body.bind('touchstart', function(event) {
          shoppinPalMainDiv.bind('touchstart', function(event) {
            if( !event.target.classList.contains('editable-panel') ) {
              $scope.dismissEdit(storeReportRow);
              //body.unbind('touchstart');
              shoppinPalMainDiv.unbind('touchstart');
            }
          });
        }
      };

      /** @method markRowAsCompleted
       * @param storereport
       * This method remove the row from store-report on left swipe
       */
      $scope.markRowAsCompleted = function(rowIndex, storeReportRow) {
        // Q: why not use the SKU field as the id?
        // A: BECAUSE many other reports may have the same product and if we do this
        //    then entries will nuke each other in the table
        $scope.waitOnPromise = StockOrderLineitemModel.prototype$updateAttributes(
          { id: storeReportRow.id },
          {
            state: ROW_STATE_COMPLETE
          }
        )
          .$promise.then(function(response){
            //console.log('hopefully finished updating the row');
            //console.log(response);

            // change the UI after the backend finishes for data-integrity/assurance
            // but if this visibly messes with UI/UX, we might want to do it earlier...
            storeReportRow.updatedAt = response.updatedAt;
            storeReportRow.state = ROW_STATE_COMPLETE;
            $scope.storesReport.splice(rowIndex, 1);
            $scope.isShipmentFullyReceived = ($scope.storesReport.length < 1) ? true : false;
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

      /** @method submitToWarehouse
       * This method will submit the store-report to warehouse
       */
      $scope.submitToWarehouse = function() {
        var dialog = ngDialog.open({ template: 'views/popup/submitToStorePopUp.html',
          className: 'ngdialog-theme-plain',
          scope: $scope
        });
        dialog.closePromise.then(function (data) {
          var proceed = data.value;
          if (proceed) {
            ReportModel.prototype$updateAttributes(
              { id: $stateParams.reportId },
              {
                state: 'warehouse'
              }
            )
              .$promise.then(function(/*response*/){
                $state.go('store-landing'); // TODO: should this point at 'warehouse-landing' instead?
              });
          }
        });
      };

      /** @method decreaseQty
       * @param storereport
       * This method decreases the ordered quantity ,when user tap on '-'' sign
       */
      $scope.decreaseQty = function(storereport) {
        storereport.orderQuantity = parseInt(storereport.orderQuantity, 10); // parse it from string to integer
        if(storereport.orderQuantity > 0){
          storereport.orderQuantity -= 1;
        }
      };

      /** @method increaseQty
       * @param storereport
       * This method increase the ordered quantity ,when user tap on '+' sign
       */
      $scope.increaseQty = function(storereport) {
        storereport.orderQuantity = parseInt(storereport.orderQuantity, 10);
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

      var setFilterBasedOnState = function(){
        if($scope.displayPendingRows) {
          $scope.storesReport = $filter('filter')(originalReportDataSet, $scope.getFilterForRowsToDisplay());
          $scope.storesReport = $filter('orderBy')($scope.storesReport, 'type');
          $scope.storesReport = $filter('groupBy')($scope.storesReport, 'type');
        }
        else {
          $scope.storesReport = $filter('filter')(originalReportDataSet, $scope.getFilterForRowsToDisplay());
          $scope.storesReport = $filter('orderBy')($scope.storesReport, 'updatedAt', true);
        }
      };

      $scope.toggleRows = function() {
        $scope.displayPendingRows = !$scope.displayPendingRows;
        setFilterBasedOnState();
      };

      $scope.getFilterForRowsToDisplay = function() {
        return ($scope.displayPendingRows) ? {state:ROW_STATE_NOT_COMPLETE} : {state:ROW_STATE_COMPLETE};
      };

      // -------------
      // Load the data
      // -------------
      $scope.displayPendingRows = true;
      $scope.device = $scope.deviceDetector.device;

      if($stateParams.reportId) {
        $scope.waitOnPromise = loginService.getReport($stateParams.reportId)
          .then(function (response) {
            originalReportDataSet = response;
            /*angular.forEach(originalReportDataSet, function (row) {
              row.state = ROW_STATE_COMPLETE;
            });
            originalReportDataSet[originalReportDataSet.length-1].state = 'pending';
            console.log(originalReportDataSet[originalReportDataSet.length-1]);*/
            setFilterBasedOnState();
            $scope.isShipmentFullyReceived = ($scope.storesReport.length < 1) ? true : false;
            //console.log('isShipmentFullyReceived', $scope.isShipmentFullyReceived);

            $scope.storereportlength = $scope.storesReport.length;
            $scope.JumtoDepartment();
          });
      }
      else { // if live data can't be loaded due to some bug, use MOCK data so testing can go on
        console.log('live data can\'t be loaded due to some bug, use MOCK data so testing can go on');
        $scope.waitOnPromise = loginService.getSelectStore()
          .then(function (response) {
            $scope.storesReport = response;
            $scope.isShipmentFullyReceived = ($scope.storesReport.length < 1) ? true : false;
            $scope.storereportlength = $scope.storesReport.length;
            $scope.JumtoDepartment();
          });
      }

    }
  ]);
