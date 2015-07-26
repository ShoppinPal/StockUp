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
    '$scope', '$anchorScroll', '$location', '$state', '$stateParams', '$filter', '$sessionStorage', '$q', /* angular's modules/services/factories etc. */
    'loginService', 'StockOrderLineitemModel', 'ReportModel', 'StoreModel', /* shoppinpal's custom modules/services/factories etc. */
    'ngDialog', 'deviceDetector', '$timeout', /* 3rd party modules/services/factories etc. */
    'ReportModelStates', /* constants */
    function ($scope, $anchorScroll, $location, $state, $stateParams, $filter, $sessionStorage, $q,
              loginService, StockOrderLineitemModel, ReportModel, StoreModel,
              ngDialog, deviceDetector, $timeout,
              ReportModelStates)
    {
      $scope.ReportModelStates = ReportModelStates;

      $scope.ROW_STATE_COMPLETE = 'complete';
      var ROW_STATE_NOT_COMPLETE = '!complete';
      var ROW_STATE_PENDING = 'pending';

      var originalReportDataSet; // no need to put everything in the $scope, only what's needed

      $scope.storeName = ($sessionStorage.currentStore) ? $sessionStorage.currentStore.name : null;

      $anchorScroll.yOffset = 50;
      $scope.storesReport = [];
      $scope.completedReports = [];
      $scope.alphabets = [];
      $scope.submitToWarehouseButton = 'Submit';
      $scope.device = deviceDetector.device;

      var currentMutableDataFieldsForRow = null;
      var getMutableDataFieldsForRow = function(storeReportRow) {
        return _.pick(storeReportRow, 'desiredStockLevel','orderQuantity','comments');
      };

      /** @method dismissEdit
       * This method will close the editable mode in store-report
       */
      $scope.dismissEdit = function(storeReportRow) { // update the backend

        /*console.log({
          desiredStockLevel: storeReportRow.desiredStockLevel,
          orderQuantity: storeReportRow.orderQuantity,
          comments: storeReportRow.comments
        });*/

        if (currentMutableDataFieldsForRow.desiredStockLevel === storeReportRow.desiredStockLevel &&
            currentMutableDataFieldsForRow.orderQuantity === storeReportRow.orderQuantity &&
            _.isEqual(currentMutableDataFieldsForRow.comments, storeReportRow.comments) )
        {
          console.log('no changes in the row');
          $timeout(function(){
            $scope.selectedRowIndex = $scope.storereportlength + 1;
          }, 0);
        }
        else {
          console.log('row has been altered');
          // TODO: In addition to the model on which a remote method is invoked,
          //       if access checks could also me made on other models involved, then
          //       it would be nice to move all these compound operations to one
          //       server-side remote method call

          // if DSL has not been changed, don't make Vend DSL update
          $scope.waitOnPromise = $q.when();
          if (currentMutableDataFieldsForRow.desiredStockLevel !== storeReportRow.desiredStockLevel){
            console.log('will save to vend');
            $scope.waitOnPromise = StoreModel.setDesiredStockLevelForVend(
              {
                id: $sessionStorage.currentStore.objectId,
                productId: storeReportRow.productId,
                desiredStockLevel: storeReportRow.desiredStockLevel
              }
            ) // NOTE: why do this first? because if this fails, we don't want our DB to have a DSL different from Vend's
              .$promise.then(function(response){
                console.log('setDesiredStockLevelForVend', 'response:', response);
                return $q.when(); //return $q.reject('test for failure');
              });
          }

          $scope.waitOnPromise = $scope.waitOnPromise
            .then(function(){
              console.log('will update warehouse model in the backend');
              // TODO: the setDesiredStockLevelForVend() op could be tied
              //       to a before or after save hook on the server side?
              return StockOrderLineitemModel.updateBasedOnState({
                  id: storeReportRow.id,
                  attributes: {
                    desiredStockLevel: storeReportRow.desiredStockLevel,
                    orderQuantity: storeReportRow.orderQuantity,
                    comments: storeReportRow.comments,
                    state: ROW_STATE_PENDING
                  }
                }
              )
                .$promise.then(function(updatedStockOrderLineitemModelInstance){
                  console.log('updatedStockOrderLineitemModelInstance', updatedStockOrderLineitemModelInstance);
                  storeReportRow.updatedAt = updatedStockOrderLineitemModelInstance.updatedAt;
                  storeReportRow.state = updatedStockOrderLineitemModelInstance.state;
                  $scope.selectedRowIndex = $scope.storereportlength + 1; // dismiss the edit view in UI
                });
            })
            .catch(function(error){
              if(error) {
                console.error(error);
              }
              else {
                console.log('TODO: tell user something went wrong! They should try again or report to an admin.');
              }
              $scope.selectedRowIndex = $scope.storereportlength + 1; // dismiss the edit view in UI
            });
        }
      };

      $scope.deleteRow = function(rowIndex, storeReportRow) {
        console.log('> > > > > ', 'deleteRow',
          '\n\t', 'rowIndex', rowIndex,
          '\n\t', '$scope.storesReport[rowIndex]', $scope.storesReport[rowIndex],
          '\n\t', 'storeReportRow', storeReportRow,
          '\n\t', 'equal?', ($scope.storesReport[rowIndex]===storeReportRow));

        // (1) remove the bindings that were meant to kick off backend-persistance for the editable row
        var shoppinPalMainDiv = angular.element(document.querySelector('.shoppinPal-warehouse'));
        if($scope.device !== 'ipad') {
          console.log('UN-binding `mousedown` event for anything non-iPad');
          shoppinPalMainDiv.unbind('mousedown');
        } else {
          console.log('UN-binding `touchstart` event for iPad');
          shoppinPalMainDiv.unbind('touchstart');
        }

        // (2) dismiss the edit view in UI
        $scope.selectedRowIndex = $scope.storereportlength + 1;

        // (3) remove the row from the array of visible pending rows,
        //     this is not a true delete from the backend,
        //     so a page refresh will bring it right back!
        $scope.storesReport.splice(rowIndex, 1);
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
        currentMutableDataFieldsForRow = getMutableDataFieldsForRow(storeReportRow);
        //console.log('currentMutableDataFieldsForRow', currentMutableDataFieldsForRow);

        /* moved the event from body to ui-view div as after adding the virtual keyboard,
           clicking on anywhere on keyboard will dismiss the edit box*/
        //var body = angular.element(document).find('body');
        var shoppinPalMainDiv = angular.element(document.querySelector('.shoppinPal-warehouse'));
        if($scope.device !== 'ipad') {
          console.log('binding to `mousedown` event for anything non-iPad');
          //body.bind('mousedown', function(event) {
          shoppinPalMainDiv.bind('mousedown', function(event) {
            if( !event.target.classList.contains('editable-panel') ) {
              $scope.dismissEdit(storeReportRow);
              //body.unbind('mousedown');
              shoppinPalMainDiv.unbind('mousedown');
            }
          });
        } else {
          console.log('binding to `touchstart` event for iPad');
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
        $scope.waitOnPromise = StockOrderLineitemModel.updateBasedOnState({
          id: storeReportRow.id,
          attributes: {}
        })
          .$promise.then(function(updatedStockOrderLineitemModelInstance){
            //console.log('hopefully finished updating the row');
            console.log('updatedStockOrderLineitemModelInstance', updatedStockOrderLineitemModelInstance);

            // change the UI after the backend finishes for data-integrity/assurance
            // but if this visibly messes with UI/UX, we might want to do it earlier...
            storeReportRow.updatedAt = updatedStockOrderLineitemModelInstance.updatedAt;
            storeReportRow.state = updatedStockOrderLineitemModelInstance.state;
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
            // server-side will update the report's state and the matching consignment's status in Vend
            $scope.waitOnPromise = ReportModel.setReportStatus({
              id: $stateParams.reportId,
              from: ReportModelStates.MANAGER_IN_PROCESS,
              to: ReportModelStates.WAREHOUSE_FULFILL
            })
              .$promise.then(function(updatedReportModelInstance){
                console.log('updatedReportModelInstance', updatedReportModelInstance);
                return $state.go('store-landing'); // TODO: based on the role this may point at 'warehouse-landing' instead!
              });
          }
        });
      };

      $scope.decreaseDSL= function(storereport) {
        storereport.desiredStockLevel = parseInt(storereport.desiredStockLevel, 10); // parse it from string to integer
        if(storereport.desiredStockLevel > 0){
          storereport.desiredStockLevel -= 1;
        }
      };
      $scope.increaseDSL = function(storereport) {
        storereport.desiredStockLevel = parseInt(storereport.desiredStockLevel, 10);
        storereport.desiredStockLevel += 1;
      };
      $scope.decreaseOrderQuantity= function(storereport) {
        storereport.orderQuantity = parseInt(storereport.orderQuantity, 10); // parse it from string to integer
        if(storereport.orderQuantity > 0){
          storereport.orderQuantity -= 1;
        }
      };
      $scope.increaseOrderQuantity = function(storereport) {
        storereport.orderQuantity = parseInt(storereport.orderQuantity, 10);
        storereport.orderQuantity += 1;
      };

      /** @method hideEdit
       *
       */
      $scope.hideEdit = function () {
        //alert('hii');
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
        return ($scope.displayPendingRows) ? {state:ROW_STATE_NOT_COMPLETE} : {state:$scope.ROW_STATE_COMPLETE};
      };

      // -------------
      // Load the data
      // -------------
      $scope.displayPendingRows = true;

      if($stateParams.reportId) {
        $scope.waitOnPromise = loginService.getReport($stateParams.reportId)
          .then(function (response) {
            originalReportDataSet = response;
            /*angular.forEach(originalReportDataSet, function (row) {
              row.state = $scope.ROW_STATE_COMPLETE;
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
