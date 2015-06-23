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
    '$scope', '$sessionStorage', 'loginService', '$stateParams',
    'deviceDetector', '$filter', '$location', '$anchorScroll',
    function ($scope, $sessionStorage, loginService, $stateParams,
              deviceDetector, $filter, $location, $anchorScroll) {
      $scope.deviceDetector = deviceDetector;
      $scope.storeName = $sessionStorage.currentStore.name;
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
      $scope.dismissEdit = function () {
        $scope.$apply(function () {
          $scope.selectedRowIndex = -1;
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
      $scope.markAsReceived = function (index) {
        delete $scope.items[index].boxNumber;
        delete $scope.items[index].boxName;
        $scope.items.splice(index, 1);
        $scope.selectedBox.totalItems -= 1;

        if ($scope.selectedBox.totalItems === 0) {
          $scope.selectedBox = null;
        }

        $scope.jumpToDepartment();
        $scope.isShipmentFullyReceived = checkIfFullyReceived();
        // TODO: call Mark as received API
      };

      /** @method shipmentFullyReceived
       * This method will is called when user clicks 'Shipment Fully Received' button
       */
      $scope.shipmentFullyReceived = function () {
        console.log('shipmentFullyReceived');
        // TODO: call shipment fully received API
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

      /** @method viewContentLoaded
       * This method will load the storesReport from api on view load
       */
      $scope.$on('$viewContentLoaded', function () {
        /*loginService.getSelectStore().then(function (response) {
         $scope.storesReport = response;
         });*/
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
        });
      });
    }
  ]);
}());