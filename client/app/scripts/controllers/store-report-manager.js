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

      var updateDSL = function(storeReportRow) {
        $scope.waitOnPromise = $q.when();
        console.log('if DSL has not been changed, then we will NOT make a Vend DSL update');
        if (currentMutableDataFieldsForRow.desiredStockLevel !== storeReportRow.desiredStockLevel){
          console.log('will save to vend', storeReportRow);
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
        return $scope.waitOnPromise;
      };

      var handleNittyGrittyStuffForDismissingEditableRow = function(){
        $scope.selectedRowIndex = $scope.storereportlength + 1; // dismiss the edit view in UI

        if($scope.unbindStoreReportRow){
          console.log('calling unbindStoreReportRow()');
          $scope.unbindStoreReportRow(); // stop "watching" the storeReportRow
        }
        else {
          console.log('no unbindStoreReportRow() available to call');
        }
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
            handleNittyGrittyStuffForDismissingEditableRow();
          }, 0);
        }
        else {
          console.log('row has been altered');
          // TODO: In addition to the model on which a remote method is invoked,
          //       if access checks could also me made on other models involved, then
          //       it would be nice to move all these compound operations to one
          //       server-side remote method call

          $scope.waitOnPromise = updateDSL(storeReportRow)
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
                  handleNittyGrittyStuffForDismissingEditableRow();
                });
            })
            .catch(function(error){
              if(error) {
                console.error(error);
              }
              else {
                console.log('TODO: tell user something went wrong! They should try again or report to an admin.');
              }
              handleNittyGrittyStuffForDismissingEditableRow();
            });
        }
      };

      var dismissEditableRow = function(rowIndex) {
        // (1) remove the bindings that were meant to kick off backend-persistance for the editable row
        var shoppinPalMainDiv = angular.element(document.querySelector('.shoppinPal-warehouse'));
        if($scope.device !== 'ipad') {
          console.log('UN-binding `mousedown` event for anything non-iPad');
          shoppinPalMainDiv.unbind('mousedown');
        } else {
          console.log('UN-binding `touchstart` event for iPad');
          shoppinPalMainDiv.unbind('touchstart');
        }

        // (2)
        handleNittyGrittyStuffForDismissingEditableRow();

        // (3) remove the row from the array of visible pending rows
        $scope.storesReport.splice(rowIndex, 1);
      };

      $scope.deleteRow = function(rowIndex, storeReportRow) {
        console.log('> > > > > ', 'deleteRow',
          '\n\t', 'rowIndex', rowIndex,
          '\n\t', '$scope.storesReport[rowIndex]', $scope.storesReport[rowIndex],
          '\n\t', 'storeReportRow', storeReportRow,
          '\n\t', 'equal?', ($scope.storesReport[rowIndex]===storeReportRow));

        StockOrderLineitemModel.deleteLineitem({
          id: storeReportRow.id
        })
          .$promise.then(function(){
            console.log('deleted StockOrderLineitemModel from backend, for id: ' + storeReportRow.id);
            dismissEditableRow(rowIndex);
          });
      };

      /** @method editRow()
       * @param selectedRowIndex
       * This method display the edit functionality on right swipe
       */
      $scope.editRow = function(selectedRowIndex) {
        console.log('inside editRow()');

        // TODO: a) swiping `ng-swipe-left` (Left-2-Right) outside the `editable-panel` should be considered
        //          grounds for dismissal and unbinding + possible persistance should happen!
        //       b) or, maybe its simpler for the editRow() method to go unbind
        //          everything else as a rule-of-thumb before it sets a new selected row
        //
        // NOTE: Here we have started with approach (b) but we still aren't invoking methods
        //       that should have persisted any changes to the server-side
        //       TODO: needs testing to find all holes and fix them
        handleNittyGrittyStuffForDismissingEditableRow(); // cleanup before starting

        $scope.selectedRowIndex = selectedRowIndex; // causes a row in the UI to be shown in the edit mode

        $scope.unbindStoreReportRow = $scope.$watch(
          'storesReport[selectedRowIndex]',
          function(newVal, oldVal){
            console.log('inside $watch() oldVal:', oldVal);
            console.log('inside $watch() newVal:', newVal);

            console.log('inside $watch() oldVal.desiredStockLevel:', oldVal.desiredStockLevel);
            console.log('inside $watch() oldVal.quantityOnHand:', oldVal.quantityOnHand);
            console.log('inside $watch() oldVal.orderQuantity:', oldVal.orderQuantity);

            if(oldVal.desiredStockLevel - oldVal.quantityOnHand === oldVal.orderQuantity) {
              console.log('previous DSL - QOH === OQ\n'+
                '(%d - %d = %d ) === %d\n' +
                'changes to DSL should result in changes to OQ',
                oldVal.desiredStockLevel,
                oldVal.quantityOnHand,
                (oldVal.desiredStockLevel - oldVal.quantityOnHand),
                oldVal.orderQuantity
              );
              // if OQ changed then don't do anything, and unbind this function
              if(newVal.orderQuantity !== oldVal.orderQuantity) {
                console.log('if OQ changed then don\'t do anything, and unbind this function');
                $scope.unbindStoreReportRow();
              }
              // if DSL changed then update the OQ
              if(newVal.desiredStockLevel !== oldVal.desiredStockLevel) {
                console.log('if DSL changed then update the OQ');
                $scope.storesReport[selectedRowIndex].orderQuantity =
                  $scope.storesReport[selectedRowIndex].desiredStockLevel -
                  $scope.storesReport[selectedRowIndex].quantityOnHand;
              }
            }
            else {
              console.log('previous DSL - QOH !== OQ\n'+
                '(%d - %d = %d ) !== %d\n' +
                'we should not change the OQ',
                oldVal.desiredStockLevel,
                oldVal.quantityOnHand,
                (oldVal.desiredStockLevel - oldVal.quantityOnHand),
                oldVal.orderQuantity
              );
            }
            //if (oldVal.desiredStockLevel !== newVal.desiredStockLevel) {}
          }
          ,true
        );
      };

      /** @method onEditInit()
       * @param storeReportRow
       * This method is called once user choose to edit a row using right swipe
       */
      $scope.onEditInit = function(storeReportRow) {
        currentMutableDataFieldsForRow = getMutableDataFieldsForRow(storeReportRow);
        //console.log('currentMutableDataFieldsForRow', currentMutableDataFieldsForRow);

        var shoppinPalMainDiv = angular.element(document.querySelector('.shoppinPal-warehouse'));
        if($scope.device !== 'ipad') {
          console.log('binding to `mousedown` event for anything non-iPad');
          shoppinPalMainDiv.bind('mousedown', function(event) {
            if( !event.target.classList.contains('editable-panel') ) {
              $scope.dismissEdit(storeReportRow);
              console.log('UN-binding `mousedown` event for anything non-iPad');
              shoppinPalMainDiv.unbind('mousedown');
            }
          });
        } else {
          bindToDismissForIPad(shoppinPalMainDiv, storeReportRow);
        }
      };

      /**
       * Motivation:
       *   (1) Initially we were only binding on the `touchstart` event
       *       so that a user may dismiss the editable row by touching outside of it.
       *   (2) But that led to a problem where scrolling led to
       *       an editable row being dismissed!
       *   (3) So the solution was expanded to also bind `touchend` and `touchmove`
       *       `Touchend` does whatever we would want a `touchstart` to do and then unbinds itself
       *       `Touchmove` basically does nothing except unbind `Touchend`
       *
       *       This results in us being able to scroll without issues and a user can
       *       still dismiss the editable row by touching outside of it.
       *
       *       Reference:
       *         http://stackoverflow.com/questions/9842587/stop-the-touchstart-performing-too-quick-when-scrolling
       *
       *  Question:
       *    (1) Why not do something similar for desktop?
       *        We could but most people don't click to scroll anymore,
       *        they use the scrollwheel so we are only focusing on the
       *        minimum-viable-product for now. Until a real user actually
       *        requests for an enhancement.
       * @param shoppinPalMainDiv
       * @param storeReportRow
       */
      var bindToDismissForIPad = function(shoppinPalMainDiv, storeReportRow){
        console.log('binding to `touchstart` event for iPad');
        shoppinPalMainDiv.bind('touchstart', function(event) {
          if (!event.target.classList.contains('editable-panel')) {
            console.log('binding to `touchend` and `touchmove` events for iPad');
            shoppinPalMainDiv.bind('touchend', function (event) {
              if (!event.target.classList.contains('editable-panel')) {
                console.log('UN-binding `touchend`, `touchmove` and `touchstart` events for iPad');
                $scope.dismissEdit(storeReportRow);
                shoppinPalMainDiv.unbind('touchend');
                shoppinPalMainDiv.unbind('touchmove');
                shoppinPalMainDiv.unbind('touchstart');
              }
            });
            shoppinPalMainDiv.bind('touchmove', function (event) {
              if (!event.target.classList.contains('editable-panel')) {
                console.log('UN-binding `touchend` and `touchmove` events for iPad');
                shoppinPalMainDiv.unbind('touchend');
                shoppinPalMainDiv.unbind('touchmove');
              }
            });
          }
        });
      };

      /** @method markRowAsCompleted
       * @param storereport
       * This method remove the row from store-report on left swipe
       */
      $scope.markRowAsCompleted = function(rowIndex, storeReportRow, dismissEditableRowFlag) {
        console.log('> > > > > ', 'markRowAsCompleted',
          '\n\t', 'rowIndex', rowIndex,/*
          '\n\t', '$scope.storesReport[rowIndex]', $scope.storesReport[rowIndex],
          '\n\t', 'storeReportRow', storeReportRow,*/
          '\n\t', 'equal?', ($scope.storesReport[rowIndex]===storeReportRow));

        $scope.waitOnPromise = $q.when();
        if(dismissEditableRowFlag) {
          console.log('only use updateDSL() in markRowAsCompleted() when dismissing the editable row using a button' +
            '\n' + 'otherwise it would have already been handled by dismissEdit()');
          $scope.waitOnPromise = updateDSL(storeReportRow);
        }
        $scope.waitOnPromise.then(
          function(){
            console.log('markRowAsCompleted',
              '\n\t', 'StockOrderLineitemModel.updateBasedOnState()');
            return StockOrderLineitemModel.updateBasedOnState({
              id: storeReportRow.id,
              attributes: {
                desiredStockLevel: storeReportRow.desiredStockLevel,
                orderQuantity: storeReportRow.orderQuantity,
                comments: storeReportRow.comments
              }
            })
              .$promise.then(function(updatedStockOrderLineitemModelInstance){
                //console.log('hopefully finished updating the row');
                console.log('updatedStockOrderLineitemModelInstance', updatedStockOrderLineitemModelInstance);

                // change the UI after the backend finishes for data-integrity/assurance
                // but if this visibly messes with UI/UX, we might want to do it earlier...
                storeReportRow.updatedAt = updatedStockOrderLineitemModelInstance.updatedAt;
                storeReportRow.state = updatedStockOrderLineitemModelInstance.state;

                if(dismissEditableRowFlag) {
                  dismissEditableRow(rowIndex);
                }
                else {
                  $scope.storesReport.splice(rowIndex, 1);
                }

                $scope.isShipmentFullyReceived = ($scope.storesReport.length < 1) ? true : false;
              });
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
