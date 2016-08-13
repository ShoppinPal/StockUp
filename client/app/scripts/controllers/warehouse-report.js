(function () {
  'use strict';
  /**
   * @ngdoc function
   * @name ShoppinPalApp.controller:WarehouseReportCtrl
   * @description
   * # WarehouseReportCtrl
   * Controller of the ShoppinPalApp
   */
  angular.module('ShoppinPalApp').controller('WarehouseReportCtrl', [
    '$scope', '$state', '$stateParams', '$anchorScroll', '$location', '$filter', /* angular's modules/services/factories etc. */
    'loginService', 'uiUtils', 'StockOrderLineitemModel', 'ReportModel', /* shoppinpal's custom modules/services/factories etc. */
    'deviceDetector', 'ngDialog', /* 3rd party modules/services/factories etc. */
    'ReportModelStates', /* constants */
    function ($scope, $state, $stateParams, $anchorScroll, $location, $filter,
              loginService, uiUtils, StockOrderLineitemModel, ReportModel,
              deviceDetector, ngDialog,
              ReportModelStates)
    {
      $scope.ReportModelStates = ReportModelStates;
      $scope.ROW_STATE_COMPLETE = 'boxed';

      $scope.submit = 'Submit';
      $scope.closeBoxButtonLabel = 'CLOSE THIS BOX';
      $scope.printSlipButtonLabel = 'PRINT PACKING SLIP';

      $scope.device = deviceDetector.device;
      $scope.boxes = [];
      $scope.selectedBox = null;
      $scope.itemsBeingViewed = [];
      $scope.allProcessed = false;

      /** @method onEditInit()
       * This method is called once user choose to edit a row using right swipe
       */
      $scope.onEditInit = function (item) {
        uiUtils.bindToTrackDismissal($scope, item);
      };

      /** @method dismissEdit
       * This method will close the editable mode in store-report
       */
      $scope.dismissEdit = function (storeReportRow) {
        // update the backend
        /*console.log('update', {
          fulfilledQuantity: storeReportRow.fulfilledQuantity,
          comments: storeReportRow.comments
        });*/
        $scope.waitOnPromise = StockOrderLineitemModel.prototype$updateAttributes(
          { id: storeReportRow.id },
          {
            fulfilledQuantity: storeReportRow.fulfilledQuantity,
            comments: storeReportRow.comments
          }
        )
          .$promise.then(function(response){
            //console.log('updated', response);
            storeReportRow.updatedAt = response.updatedAt;
            uiUtils.handleNittyGrittyStuffForDismissingEditableRow($scope);
          });
      };

      /** @method printDiv
       * @param divName
       * Print packaging slip
       */
      $scope.printSlip = function (divName) {
        var printContents = document.getElementById(divName).innerHTML;
        var popupWin = window.open('', '_blank', 'width=300,height=300');
        popupWin.document.open();
        var printSlipHTML =
            '<html><head><link rel="stylesheet" type="text/css" href="style.css" />' +
            '</head><body onload="window.print()">' + printContents + '</html>';
        popupWin.document.write(printSlipHTML);
        popupWin.document.close();
      };

      /** @method submitToReceiver
       * Submit the warehouse page to receiver
       */
      $scope.submitToReceiver = function () {
        var dialog = ngDialog.open({ template: 'views/popup/submitToReceiverPopUp.html',
          className: 'ngdialog-theme-plain',
          scope: $scope
        });
        dialog.closePromise.then(function (data) {
          //console.log('dialog has been dismissed: ', data);
          //console.log('proceed?', data.value);
          var proceed = data.value;
          if (proceed) {
            //console.log('submitting report');
            // server-side will update the report's state and create the matching consignment in Vend
            // and then set it from OPEN to SENT
            $scope.waitOnPromise = ReportModel.setReportStatus({
              id: $stateParams.reportId,
              from: ReportModelStates.WAREHOUSE_FULFILL,
              to: ReportModelStates.MANAGER_RECEIVE
            })
              .$promise.then(function(updatedReportModelInstance){
                console.log('updatedReportModelInstance', updatedReportModelInstance);
                $state.go('warehouse-landing');
              });
          }
        });
      };

      var setupUnboxedItems = function(response) {
        $scope.orderedItems = _.filter(response, function(item){
          return item.state !== 'boxed';
        });
        // if fulfilledQuantity hasn't been set, then it should equal orderQuantity by default
        angular.forEach($scope.orderedItems, function (item) {
          if(item.fulfilledQuantity === undefined || item.fulfilledQuantity === null) {
            item.fulfilledQuantity = item.orderQuantity;
          }
        });
        // copy the items (order by type) to a new list for display
        $scope.itemsBeingViewed = $filter('orderBy')($scope.orderedItems, 'type');
      };

      var setupBoxes = function(response){
        var existingBoxes = _.chain(response).countBy('boxNumber').value();
        //console.log(existingBoxes);
        if (existingBoxes && _.keys(existingBoxes).length > 0) {
          populateExistingBoxes(existingBoxes);
        }
        else {
          $scope.addNewBox();
        }
      };

      /** @method addNewBox
       * @description
       * New open box added at top box status
       */
      $scope.addNewBox = function () {
        var box = {
          'boxNumber': $scope.boxes.length + 1,
          'boxName': 'Box' + String($scope.boxes.length + 1),
          'totalItems': 0,
          'isOpen': true
        };
        $scope.boxes.push(box);
        $scope.selectedBox = $scope.boxes[$scope.boxes.length - 1];
      };

      var populateExistingBoxes = function(existingBoxes) {
        var boxNumbersAsKeys = _.filter(_.keys(existingBoxes),function(key){
          var number = Number(key);
          return _.isNumber(number) && _.isFinite(number);
        }); // Math.max.apply(null, boxNumbersAsKeys)
        //console.log(boxNumbersAsKeys);

        // NOTE: maxBoxNumber most likely equals the length of existingBoxes anyway
        //       so there shouldn't be any need to explicitly calculate it
        //var maxBoxNumber = Math.max.apply(null, boxNumbersAsKeys);
        //console.log(maxBoxNumber);

        _.each(boxNumbersAsKeys, function(boxNumberAsKey){
          var box = {
            'boxNumber': Number(boxNumberAsKey),
            'boxName': 'Box' + boxNumberAsKey,
            'totalItems': existingBoxes[boxNumberAsKey],
            // keep the box with the biggest #, open by default
            'isOpen': (Number(boxNumberAsKey) === boxNumbersAsKeys.length) ? true : false
          };
          //console.log('adding', box);
          $scope.boxes.push(box);
          $scope.selectedBox = $scope.boxes[$scope.boxes.length - 1]; // ASSUMPTION: boxNumbersAsKeys is already naturally sorted
        });
      };

      /** @method closeBox
       * This will close the box
       */
      $scope.closeBox = function () {
        //box.isOpen = false;
        $scope.selectedBox.isOpen = false;
        $scope.selectedBox = null;
        $scope.toggleActiveBoxContents(false); // make sure that we go back to viewing unboxed products
      };

      $scope.displayBoxedContents = false;
      $scope.toggleActiveBoxContents = function (beSpecific) {
        if(beSpecific === true || beSpecific === false) {
          $scope.displayBoxedContents = beSpecific;
        }
        else {
          $scope.displayBoxedContents = !$scope.displayBoxedContents;
        }

        // TODO: update the JUMP-TO sidebar or completely delete it?
        if ($scope.displayBoxedContents) {
          var filterData1 = {'boxNumber': $scope.selectedBox.boxNumber};
          $scope.itemsBeingViewed = $filter('filter')($scope.allOrderedItems, filterData1);
        }
        else {
          var filterData2 = {'state': '!boxed'};
          $scope.itemsBeingViewed = $filter('filter')($scope.orderedItems, filterData2);
          $scope.itemsBeingViewed = $filter('orderBy')($scope.itemsBeingViewed, 'type');
        }
      };

      /** @method moveToBox
       * This method assigns selected box number and box name to the item swiped to right
       */
      $scope.moveToBox = function (item, index) {
        if($scope.selectedBox) {
          $scope.selectedBox.totalItems ++; // update totals for current box
          removeItem(index);

          $scope.waitOnPromise = StockOrderLineitemModel.prototype$updateAttributes(
            { id: item.id },
            {
              fulfilledQuantity: item.fulfilledQuantity,
              comments: item.comments,
              boxNumber: $scope.selectedBox.boxNumber,
              state: $scope.ROW_STATE_COMPLETE
            }
          )
            .$promise.then(function(response){
              //console.log('hopefully finished updating the row');
              //console.log(response);

              // change the UI after the backend finishes for data-integrity/assurance
              // but if this visibly messes with UI/UX, we might want to do it earlier...
              item.updatedAt = response.updatedAt;
              item.state = $scope.ROW_STATE_COMPLETE;
              item.boxNumber = response.boxNumber;

              // check if all items have been processed, if yes close the box and enable submit button
              if($scope.itemsBeingViewed.length === 0) {
                $scope.allProcessed = true;
                $scope.closeBox($scope.selectedBox);
              }

              // keep the departments updated as per the remaining items
              $scope.jumpToDepartment();
            });
        } else {
          // TODO: remove this alert and use some good stuff
          alert('Please open a box');
        }
      };

      var removeItem = function(rowIndex) {
        console.log('remove the item from the currently rendered list');
        $scope.itemsBeingViewed.splice(rowIndex, 1);

        console.log('remove the item from the order~able list');
        $scope.orderedItems.splice(rowIndex, 1);
      };

      var dismissEditableRow = function(rowIndex) {
        // (1)
        uiUtils.handleNittyGrittyStuffForDismissingEditableRow($scope);

        // (2)
        removeItem(rowIndex);
      };

      $scope.hideRow = function(rowIndex, item) {
        console.log('> > > > > ', 'hideRow',
          '\n\t', 'rowIndex', rowIndex,
          '\n\t', '$scope.itemsBeingViewed[rowIndex]', $scope.itemsBeingViewed[rowIndex],
          '\n\t', 'item', item,
          '\n\t', 'equal?', ($scope.itemsBeingViewed[rowIndex]===item));

        $scope.waitOnPromise = StockOrderLineitemModel.prototype$updateAttributes(
          { id: item.id },
          {
            hidden: true
          }
        )
          .$promise.then(function(response){
            //console.log('updated', response);
            item.hidden = response.hidden;
            dismissEditableRow(rowIndex);
          });
      };

      /** @method editRow
       * @param selectedRow
       * enable the edit mode in UI
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

      /** @method decreaseQty
       * @param item
       * This method decreases the desiredStockLevel quantity ,when user tap on '-'' sign
       */
      $scope.decreaseQty = function (item) {
        item.fulfilledQuantity = parseInt(item.fulfilledQuantity, 10); // parse it from string to integer
        if (item.fulfilledQuantity > 0) {
          item.fulfilledQuantity -= 1;
        }
      };

      /** @method increaseQty
       * @param item
       * This method increase the desiredStockLevel quantity ,when user tap on '+' sign
       */
      $scope.increaseQty = function (item) {
        item.fulfilledQuantity = parseInt(item.fulfilledQuantity, 10);
        item.fulfilledQuantity += 1;
      };


      /** @method goToDepartment
       * @param value
       * This method
       */
      $scope.goToDepartment = function (value) {
        var jumpToHash;
        if (value) {
          for (var i = 0; i < $scope.itemsBeingViewed.length; i++) {
            var type = $scope.itemsBeingViewed[i].type,
                typeFirstChar = type.slice(0, 1).toUpperCase();
            $scope.alphabets.push(typeFirstChar);
            if (typeFirstChar === value) {
              jumpToHash = 'jumpTo' + $scope.itemsBeingViewed[i].type;
              break; // stop at the first matching department
            }
          }

        }
        $location.hash(jumpToHash);
        $anchorScroll();
      };

      /** @method jumpToDepartment
       * This method will return available departments firstChar for jumpTo department functionality
       */
      $scope.jumpToDepartment = function () {
        $scope.alphabets = [];
        for (var i = 0; i < $scope.itemsBeingViewed.length; i++) {
          var type = $scope.itemsBeingViewed[i].type,
              typeFirstChar = type.slice(0, 1).toUpperCase();
          $scope.alphabets.push(typeFirstChar);
        }
        $scope.alphabets.sort();
      };

      /*var makeItEasyToTestSubmission = function(){
        // auto place N-1 items in a box
        $scope.selectedBox.totalItems = $scope.orderedItems.length-1;
        $scope.itemsBeingViewed = [$scope.orderedItems[$scope.orderedItems.length-1]];
        console.log(
          '$scope.orderedItems.length', $scope.orderedItems.length, '\n',
          '$scope.itemsBeingViewed.length', $scope.itemsBeingViewed.length, '\n',
          '$scope.selectedBox.totalItems', $scope.selectedBox.totalItems
        );
      };*/

      // -------------
      // Load the data
      // -------------

      /** @method viewContentLoaded
       * This method will load the storesReport from api on view load
       */
      $scope.$on('$viewContentLoaded', function () {
        if($stateParams.reportId) {
          $scope.waitOnPromise = loginService.getReport($stateParams.reportId)
            .then(function (response) {
              $scope.storeName = response.storeName;
              var lineItems = response.stockOrderLineitemModels;
              $scope.allOrderedItems = lineItems;

              //filter out anything with ordered quantity of zero from a warehouse report
              lineItems = _.filter(lineItems, function(item){
                return item.orderQuantity && item.orderQuantity > 0;
              });
              //filter out any hidden (pseudo-deleted) rows
              lineItems = _.filter(lineItems, function(item){
                return !item.hidden;
              });

              setupBoxes(response);
              setupUnboxedItems(response);
              //makeItEasyToTestSubmission();
              $scope.jumpToDepartment();
            });
        }
        else { // if live data can't be loaded due to some bug, use MOCK data so testing can go on
          loginService.getWarehouseReport().then(function (response) {
            $scope.allOrderedItems = response.data.stockOrderLineitemModels;
            $scope.orderedItems = response.data.stockOrderLineitemModels;
            angular.forEach($scope.orderedItems, function (item) {
              item.fulfilledQuantity = item.orderQuantity;
            });
            // copy the items (order by type) to a new list for display
            $scope.itemsBeingViewed = $filter('orderBy')($scope.orderedItems, 'type');
            $scope.addNewBox();
            $scope.jumpToDepartment();
          });
        }
      });
    }
  ]);
}());