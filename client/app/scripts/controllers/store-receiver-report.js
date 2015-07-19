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
    'loginService', 'StockOrderLineitemModel', 'ReportModel', /* shoppinpal's custom modules/services/factories etc. */
    'deviceDetector', 'ngDialog', /* 3rd party modules/services/factories etc. */
    'ReportModelStates', /* constants */
    function ($scope, $sessionStorage, $state, $stateParams, $filter, $location, $anchorScroll,
              loginService, StockOrderLineitemModel, ReportModel,
              deviceDetector, ngDialog,
              ReportModelStates)
    {
      var ROW_STATE_UNBOXED = 'unboxed';

      $scope.deviceDetector = deviceDetector;
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

      /** @method editReceivedQuantity()
       * @param selectedRow
       * This method display the edit functionality on right swipe
       */
      $scope.editReceivedQuantity = function (selectedRow) {
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
          $scope.jumpToDepartment();
        }
      };

      /** @method onEditInit()
       * @param item
       * This method is called once user choose to edit order name using right swipe
       */
      $scope.onEditInit = function (item) {
        var shoppinPalMainDiv = angular.element(document.querySelector('.shoppinPal-warehouse'));
        if ($scope.deviceDetector.isDesktop()) {
          shoppinPalMainDiv.bind('mousedown', function (event) {
            if (!event.target.classList.contains('editable-panel')) {
              $scope.dismissEdit(item);
              shoppinPalMainDiv.unbind('mousedown');
            }
          });
        } else {
          shoppinPalMainDiv.bind('touchstart', function (event) {
            if (!event.target.classList.contains('editable-panel')) {
              $scope.dismissEdit(item);
              shoppinPalMainDiv.unbind('touchstart');
            }
          });
        }
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
      $scope.markAsReceived = function (index, storeReportRow) {
        $scope.waitOnPromise = StockOrderLineitemModel.updateBasedOnState({
            id: storeReportRow.id,
            attributes: {
              receivedQuantity: storeReportRow.receivedQuantity, /* NOTE: why pass receivedQuantity explicitly here?
              this is calculated by the UI, so if someone doesn't edit the row and directly marks it as done,
              we would miss out on persisting this value*/
              state: ROW_STATE_UNBOXED
            }
          }
        )
          .$promise.then(function(updatedStockOrderLineitemModelInstance){
            console.log('hopefully finished updating the row');
            console.log('updatedStockOrderLineitemModelInstance', updatedStockOrderLineitemModelInstance);

            // change the UI after the backend finishes for data-integrity/assurance
            // but if this visibly messes with UI/UX, we might want to do it earlier...
            storeReportRow.updatedAt = updatedStockOrderLineitemModelInstance.updatedAt;
            storeReportRow.state = updatedStockOrderLineitemModelInstance.state;

            delete $scope.items[index].boxNumber;
            delete $scope.items[index].boxName;
            $scope.items.splice(index, 1);
            $scope.selectedBox.totalItems -= 1;

            if ($scope.selectedBox.totalItems === 0) {
              $scope.selectedBox = null;
            }

            $scope.jumpToDepartment();
            $scope.isShipmentFullyReceived = checkIfFullyReceived();
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

      /** @method goToDepartment
       * @param value
       * This method
       */
      $scope.goToDepartment = function (value) {
        var jumpToHash;
        if (value) {
          for (var i = 0; i < $scope.items.length; i++) {
            var type = $scope.items[i].type,
                typeFirstChar = type.slice(0, 1).toUpperCase();
            $scope.alphabets.push(typeFirstChar);
            if (typeFirstChar === value) {
              jumpToHash = 'jumpTo' + $scope.items[i].type;
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
        for (var i = 0; i < $scope.items.length; i++) {
          var type = $scope.items[i].type,
              typeFirstChar = type.slice(0, 1).toUpperCase();
          $scope.alphabets.push(typeFirstChar);
        }
      };


      var setupBoxes = function(response){
        var existingBoxes = _.chain(response).countBy('boxNumber').value();
        console.log(existingBoxes);
        if (existingBoxes && _.keys(existingBoxes).length > 0) {
          populateExistingBoxes(existingBoxes);
        }
      };

      var populateExistingBoxes = function(existingBoxes) {
        $scope.boxes = [];
        var boxNumbersAsKeys = _.filter(_.keys(existingBoxes),function(key){
          var number = Number(key);
          return _.isNumber(number) && _.isFinite(number);
        }); // Math.max.apply(null, boxNumbersAsKeys)
        console.log(boxNumbersAsKeys);

        // NOTE: maxBoxNumber most likely equals the length of existingBoxes anyway
        //       so there shouldn't be any need to explicitly calculate it
        //var maxBoxNumber = Math.max.apply(null, boxNumbersAsKeys);
        //console.log(maxBoxNumber);

        _.each(boxNumbersAsKeys, function(boxNumberAsKey){
          var box = {
            'boxNumber': Number(boxNumberAsKey),
            'boxName': 'Box' + boxNumberAsKey,
            'totalItems': existingBoxes[boxNumberAsKey], // TODO: should only count items that are still boxed!!!
            'isOpen': false
          };
          console.log('adding', box);
          $scope.boxes.push(box);
        });
      };

      var setupBoxedItems = function(response) {
        $scope.receivedItems = _.filter(response, function(item){
          return item.state !== ROW_STATE_UNBOXED;
        });
        // if receivedQuantity hasn't been set, then it should equal fulfilledQuantity by default
        angular.forEach($scope.receivedItems, function (item) {
          if(item.receivedQuantity === undefined || item.receivedQuantity === null) {
            item.receivedQuantity = item.fulfilledQuantity;
          }
        });
      };

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
              setupBoxes(response);
              setupBoxedItems(response);
              $scope.isShipmentFullyReceived = checkIfFullyReceived();
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