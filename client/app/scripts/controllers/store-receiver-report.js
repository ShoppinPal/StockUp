(function () {
  'use strict';
  /**
   * @ngdoc function
   * @name ShoppinPalApp.controller:WarehouseReportCtrl
   * @description
   * # WarehouseReportCtrl
   * Controller of the ShoppinPalApp
   */
  angular.module('ShoppinPalApp').controller('StoreReceiverCtrl', [
    '$scope', '$sessionStorage', '$state', '$stateParams', '$filter', '$location', '$anchorScroll', /* angular's modules/services/factories etc. */
    'loginService', 'uiUtils','StockOrderLineitemModel', 'ReportModel', /* shoppinpal's custom modules/services/factories etc. */
    'deviceDetector', 'ngDialog', /* 3rd party modules/services/factories etc. */
    'ReportModelStates', /* constants */
    function ($scope, $sessionStorage, $state, $stateParams, $filter, $location, $anchorScroll,
              loginService, uiUtils, StockOrderLineitemModel, ReportModel,
              deviceDetector, ngDialog,
              ReportModelStates)
    {
      $scope.ReportModelStates = ReportModelStates;
      $scope.ROW_STATE_BOXED = 'boxed';
      $scope.ROW_STATE_UNBOXED = 'unboxed';

      $scope.device = deviceDetector.device;
      $scope.storeName = ($sessionStorage.currentStore) ? $sessionStorage.currentStore.name : null;
      $scope.isShipmentFullyReceived = false;
      $scope.items = [];
      $scope.alphabets = [];

      /** @method decreaseQty
       * @param item
       * This method decreases the ordered quantity ,when user tap on '-'' sign
       */
      $scope.decreaseQty = function (item) {
        item.receivedQuantity = parseInt(item.receivedQuantity, 10); // parse it from string to integer
        if (item.receivedQuantity > 0) {
          item.receivedQuantity -= 1;
        }
      };

      /** @method increaseQty
       * @param item
       * This method increase the ordered quantity ,when user tap on '+' sign
       */
      $scope.increaseQty = function (item) {
        item.receivedQuantity = parseInt(item.receivedQuantity, 10);
        item.receivedQuantity += 1;
      };

      /** @method editRow()
       * @param selectedRow
       * This method display the edit functionality on right swipe
       */
      $scope.editRow = function (selectedRow) {
        console.log('inside editRow()');

        /**
         * As a rule-of-thumb its simpler for the editRow() method to go unbind everything else
         * related to the previous row, before it sets a new selected row
         */
        uiUtils.handleNittyGrittyStuffForDismissingEditableRow($scope); // cleanup before starting

        $scope.selectedRowIndex = selectedRow;
      };

      /** @method closeAnyOpenBox()
       * This method closes all opened boxes
       */
      var closeAnyOpenBox = function () {
        $scope.selectedRowIndex = -1;
        angular.forEach($scope.boxes, function (box) {
          if (box.totalItems > 0) {
            box.isOpen = false;
          }
        });
      };

      /** @method openBox()
       * @param box
       * This method opens a box and list the items inside it
       */
      $scope.openBox = function (box) {
        console.log('inside openBox');
        if (!$scope.selectedBox) {
          closeAnyOpenBox();
          $scope.selectedBox = box;
          box.isOpen = true;

          var filterData = {'boxNumber': box.boxNumber};
          $scope.items = $filter('filter')(angular.copy($scope.receivedItems), filterData);
          $scope.items = $filter('orderBy')($scope.items, 'sku');
          // NOTE: by handling the filtering here we reduce the time spent in the $digest cycle
          //       AND we don't have to do a search for the correct index later on like:
          //         $scope.items.splice($scope.items.indexOf(item),1); // correct index but slower
          //           vs.
          //         $scope.items.splice(rowIndex, 1); // incorrect rowIndex handed by UI if filtering happens via directive
          //       which would take additional time on the user's device/browser
        }
      };

      /** @method onEditInit()
       * @param item
       * This method is called once user choose to edit order name using right swipe
       */
      $scope.onEditInit = function (item) {
        uiUtils.bindToTrackDismissal($scope, item);
      };

      /** @method dismissEdit
       * This method will close the editable mode in store-report
       */
      $scope.dismissEdit = function (storeReportRow) {
        // update the backend
        /*console.log({
          receivedQuantity: storeReportRow.receivedQuantity
        });*/
        $scope.waitOnPromise = StockOrderLineitemModel.prototype$updateAttributes(
          { id: storeReportRow.id },
          {
            comments: storeReportRow.comments,
            receivedQuantity: storeReportRow.receivedQuantity
          }
        )
          .$promise.then(function(response){
            //console.log(response);
            storeReportRow.updatedAt = response.updatedAt;
            $scope.selectedRowIndex = $scope.storereportlength + 1; // dismiss the edit view in UI
            //$scope.selectedRowIndex = -1;
          });
      };

      /** @method checkIfFullyReceived
       * This method will check if all items have been received
       */
      function checkIfFullyReceived() {
        var isShipmentFullyReceived = true;
        angular.forEach($scope.boxes, function (box) {
          if (box.totalItems > 0) {
            isShipmentFullyReceived = false;
          }
        });

        return isShipmentFullyReceived;
      }

      /** @method markAsReceived
       * This method will mark the item as received when it is swiped to right
       */
      $scope.markAsReceived = function (rowIndex, storeReportRow, dismissEditableRowFlag) {
        console.log('> > > > > ', 'markAsReceived',
          '\n\t', 'rowIndex', rowIndex,/*
           '\n\t', '$scope.items[rowIndex]', $scope.items[rowIndex],
           '\n\t', 'storeReportRow', storeReportRow,*/
          '\n\t', 'equal?', ($scope.items[rowIndex]===storeReportRow));

        $scope.waitOnPromise = StockOrderLineitemModel.updateBasedOnState({
            id: storeReportRow.id,
            attributes: {
              comments: storeReportRow.comments,
              receivedQuantity: storeReportRow.receivedQuantity,
              state: $scope.ROW_STATE_UNBOXED
            } // NOTE: why pass receivedQuantity explicitly here?
              //       this is calculated by the UI, so if someone doesn't edit the row and directly marks it as done,
              //       we would miss out on persisting this value
          }
        )
          .$promise.then(function(updatedStockOrderLineitemModelInstance){
            console.log('hopefully finished updating the row');
            console.log('updatedStockOrderLineitemModelInstance', updatedStockOrderLineitemModelInstance);

            // change the UI after the backend finishes for data-integrity/assurance
            // but if this visibly messes with UI/UX, we might want to do it earlier...
            storeReportRow.updatedAt = updatedStockOrderLineitemModelInstance.updatedAt;
            storeReportRow.state = updatedStockOrderLineitemModelInstance.state;

            if(dismissEditableRowFlag) {
              uiUtils.handleNittyGrittyStuffForDismissingEditableRow($scope);
            }

            // update originalReportDataSet
            var originalRowIndex = _.findIndex(originalReportDataSet, {id: storeReportRow.id});
            originalReportDataSet.splice(originalRowIndex, 1);

            // update rows being viewed
            delete $scope.items[rowIndex].boxNumber;
            delete $scope.items[rowIndex].boxName;
            $scope.items.splice(rowIndex, 1);
            $scope.selectedBox.totalItems -= 1;

            if ($scope.selectedBox.totalItems === 0) {
              $scope.selectedBox = null;
            }

            $scope.isShipmentFullyReceived = checkIfFullyReceived();
          })
          .catch(function(error){
            console.error(error);
            // NOTE: this a stop-gap measure because the styling for $spAlerts
            //       doesn't fit well anywhere on the current view
            alert('Something went wrong! Try again or report to an admin.', 'error');
          });
      };

      /** @method shipmentFullyReceived
       * This method will is called when user clicks 'Shipment Fully Received' button
       */
      $scope.shipmentFullyReceived = function () {
        console.log('shipmentFullyReceived');
        var dialog = ngDialog.open({ template: 'views/popup/submitToClosePopUp.html',
          className: 'ngdialog-theme-plain',
          scope: $scope
        });
        dialog.closePromise.then(function (data) {
          //console.log('dialog has been dismissed: ', data);
          //console.log('proceed?', data.value);
          var proceed = data.value;
          if (proceed) {
            //console.log('submitting report');
            // server-side will update the report's state and the matching consignment's status in Vend
            $scope.waitOnPromise = ReportModel.setReportStatus({
              id: $stateParams.reportId,
              from: ReportModelStates.MANAGER_RECEIVE,
              to: ReportModelStates.REPORT_COMPLETE
            })
              .$promise.then(function(updatedReportModelInstance){
                console.log('updatedReportModelInstance', updatedReportModelInstance);
                return $state.go('store-landing'); // TODO: based on the role this may point at 'warehouse-landing' instead!
              });
          }
        });
      };

      var setupBoxes = function(response){
        var groupByBoxNumber = _.chain(response).groupBy('boxNumber').value();
        var boxNumberToRemainingItemCounts = {};
        _.each(groupByBoxNumber, function(groupedItems, boxNumber){
          console.log('boxNumber:', boxNumber, 'groupedItems:', groupedItems);
          var countByState = _.countBy(groupedItems, function(item){
            return item.state;
          });
          // only work with items that are still boxed, but still show an empty (zero) box
          boxNumberToRemainingItemCounts[boxNumber] = countByState.boxed || 0;
        });
        console.log('boxNumberToRemainingItemCounts', boxNumberToRemainingItemCounts);

        if (boxNumberToRemainingItemCounts && _.keys(boxNumberToRemainingItemCounts).length > 0) {
          populateExistingBoxes(boxNumberToRemainingItemCounts);
        }
      };

      var populateExistingBoxes = function(boxNumberToRemainingItemCounts) {
        $scope.boxes = [];
        var boxNumbersAsKeys = _.filter(_.keys(boxNumberToRemainingItemCounts),function(boxNumber){
          var number = Number(boxNumber);
          return _.isNumber(number) && _.isFinite(number);
        }); // Math.max.apply(null, boxNumbersAsKeys)
        console.log(boxNumbersAsKeys);

        // NOTE: maxBoxNumber most likely equals the length of boxNumberToRemainingItemCounts anyway
        //       so there shouldn't be any need to explicitly calculate it
        //var maxBoxNumber = Math.max.apply(null, boxNumbersAsKeys);
        //console.log(maxBoxNumber);

        _.each(boxNumbersAsKeys, function(boxNumberAsKey){
          var box = {
            'boxNumber': Number(boxNumberAsKey),
            'boxName': 'Box' + boxNumberAsKey,
            'totalItems': boxNumberToRemainingItemCounts[boxNumberAsKey],
            'isOpen': false
          };
          console.log('adding', box);
          $scope.boxes.push(box);
        });
      };

      var setupBoxedItems = function(response) {
        $scope.receivedItems = _.filter(response, function(item){
          return item.state !== $scope.ROW_STATE_UNBOXED;
        });
        // if receivedQuantity hasn't been set, then it should equal fulfilledQuantity by default
        angular.forEach($scope.receivedItems, function (item) {
          if(item.receivedQuantity === undefined || item.receivedQuantity === null) {
            item.receivedQuantity = item.fulfilledQuantity;
          }
        });
      };

      // ----
      // setup the logic for looking up and adding a product by SKU
      // ----
      uiUtils.lookupAndAddProductBySku($scope, $stateParams, ngDialog, ReportModel,
        function(closeDialogMethod, stockOrderLineitemModelInstance){
          console.log('store-receiver-report', 'stockOrderLineitemModelInstance:', stockOrderLineitemModelInstance);

          // update the client-side list and redo any setup
          originalReportDataSet.push(stockOrderLineitemModelInstance);
          setup();

          // explicitly unset/reset to repaint UI
          var temp = $scope.selectedBox;
          $scope.selectedBox = null;
          $scope.openBox(temp);

          closeDialogMethod('true');
        }
      );

      // -------------
      // Load the data
      // -------------
      var originalReportDataSet; // no need to put everything in the $scope, only what's needed

      var setup = function(){
        setupBoxes(originalReportDataSet);
        setupBoxedItems(originalReportDataSet);
        $scope.isShipmentFullyReceived = checkIfFullyReceived();
      };

      /** @method viewContentLoaded
       * This method will load the storesReport from api on view load
       */
      $scope.$on('$viewContentLoaded', function () {
        if($stateParams.reportId) {
          $scope.waitOnPromise = loginService.getReport($stateParams.reportId)
            .then(function (response) {
              originalReportDataSet = response.stockOrderLineitemModels;
              setup();
            });
        }
        else { // if live data can't be loaded due to some bug, use MOCK data so testing can go on
          loginService.getReceiverReport($stateParams.reportId).then(function (response) {
            $scope.receivedItems = response.data.stockOrderLineitemModels;
            var boxes = [];
            $scope.boxes = [];
            angular.forEach($scope.receivedItems, function (item) {
              item.receivedQuantity = item.fulfilledQuantity;
              if (boxes.indexOf(item.boxNumber) < 0) {
                boxes.push(item.boxNumber);
                $scope.boxes.push({'boxNumber': item.boxNumber, 'boxName': item.boxName});
              }
            });

            angular.forEach($scope.boxes, function (box) {
              var filterData = {'boxNumber': box.boxNumber};
              box.totalItems = $filter('filter')($scope.receivedItems, filterData).length;
            });
            boxes = null;
            $scope.isShipmentFullyReceived = checkIfFullyReceived();
          });
        }
      });
    }
  ]);
}());