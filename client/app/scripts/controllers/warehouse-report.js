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
    '$scope', '$state', '$stateParams', '$anchorScroll', '$location', /* angular's modules/services/factories etc. */
    'loginService', /* shoppinpal's custom modules/services/factories etc. */
    'deviceDetector', /* 3rd party modules/services/factories etc. */
    function ($scope, $state, $stateParams, $anchorScroll, $location,
              loginService,
              deviceDetector)
    {
      $scope.submit = 'Submit';
      $scope.closeBoxButtonLabel = 'CLOSE THIS BOX';
      //$scope.printSlipButtonLabel = 'PRINT PACKING SLIP';
      $scope.ReviewSubmitPage = true;
      $scope.deviceDetector = deviceDetector;
      $scope.boxes = [];
      $scope.selectedBox = null;
      $scope.items = [];
      $scope.allProcessed = false;

      /** @method onEditInit()
       * This method is called once user choose to edit a row using right swipe
       */
      $scope.onEditInit = function () {
        var shoppinPalMainDiv = angular.element(document.querySelector('.shoppinPal-warehouse'));
        if ($scope.deviceDetector.isDesktop()) {
          shoppinPalMainDiv.bind('mousedown', function (event) {
            if (!event.target.classList.contains('editable-panel')) {
              $scope.dismissEdit();
              shoppinPalMainDiv.unbind('mousedown');
            }
          });
        } else {
          shoppinPalMainDiv.bind('touchstart', function (event) {
            if (!event.target.classList.contains('editable-panel')) {
              $scope.dismissEdit();
              shoppinPalMainDiv.unbind('touchstart');
            }
          });
        }
      };

      /** @method dismissEdit
       * This method will close the editable mode in store-report
       */
      $scope.dismissEdit = function () {
        /* using $scope.$apply() because the view was not updating  */
        $scope.$apply(function () {
          $scope.selectedRowIndex = -1;
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
        // TODO: call submitToReceiver API
      };

      /** @method addNewBox
       * @description
       * New open box added at top box status
       */
      $scope.addNewBox = function () {
        var box = {
          'boxNumber':1,
          'boxName': 'Box' + String($scope.boxes.length + 1),
          'totalItems': 0,
          'isOpen': true
        };
        $scope.boxes.push(box);
        $scope.selectedBox = $scope.boxes[$scope.boxes.length - 1];
      };

      /** @method closeBox
       * This will close the box
       */
      $scope.closeBox = function (box) {
        box.isOpen = false;
        $scope.selectedBox = null;
      };

      /** @method moveToBox
       * This method assigns selected box number and box name to the item swiped to right
       */
      $scope.moveToBox = function (item, index) {
        if($scope.selectedBox) {
          // find the item and copy it to the original list
          for (var i = 0; i < $scope.orderedItems.length; i++) {
            if ($scope.orderedItems[i].sku === item.sku) {
              $scope.orderedItems[i] = angular.copy(item);
              $scope.selectedBox.totalItems ++;
              $scope.items.splice(index, 1);
              break;
            }
          }

          // check if all items have been processed, if yes close the box and enable submit button
          if($scope.items.length === 0) {
            $scope.allProcessed = true;
            $scope.closeBox($scope.selectedBox);
          }

          // keep the departments updated as per the remaining items
          $scope.jumpToDepartment();
        } else {
          // TODO: remove this alert and use some good stuff
          alert('Please open a box');
        }
      };

      /** @method editWarehouse
       * @param selectedRow
       * enable the edit mode in UI
       */
      $scope.editWarehouse = function (selectedRow) {
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

      // -------------
      // Load the data
      // -------------

      /** @method viewContentLoaded
       * This method will load the storesReport from api on view load
       */
      $scope.$on('$viewContentLoaded', function () {
        if($stateParams.reportId) {
          $scope.waitOnPromise = loginService.getStoreReport($stateParams.reportId)
            .then(function (response) {
              $scope.orderedItems = response;
              angular.forEach($scope.orderedItems, function (item) {
                if(item.fulfilledQuantity === undefined || item.fulfilledQuantity === null) {
                  item.fulfilledQuantity = item.orderQuantity;
                }
              });
              // copy the items to a new list for display
              $scope.items = angular.copy($scope.orderedItems);
              $scope.addNewBox();
              $scope.jumpToDepartment();
            });
        }
        else { // if live data can't be loaded due to some bug, use MOCK data so testing can go on
          loginService.getWarehouseReport().then(function (response) {
            $scope.orderedItems = response.data.stockOrderLineitemModels;
            angular.forEach($scope.orderedItems, function (item) {
              item.fulfilledQuantity = item.orderQuantity;
            });
            // copy the items to a new list for display
            $scope.items = angular.copy($scope.orderedItems);
            $scope.addNewBox();
            $scope.jumpToDepartment();
          });
        }
      });
    }
  ]);
}());