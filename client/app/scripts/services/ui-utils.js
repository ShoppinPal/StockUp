'use strict';

/**
 * @ngdoc service
 * @name ShoppinPalApp.loginService
 * @description
 * # loginService
 * Service in the ShoppinPalApp.
 */
angular.module('ShoppinPalApp')
  .service('uiUtils', [
    '$filter', /* angular's modules/services/factories etc. */
    '$spAlerts', /* shoppinpal's custom modules/services/factories etc. */
    function ($filter,
              $spAlerts)
    {
      var bindToTrackDismissal = function($scope, row){
        console.log('inside bindToTrackDismissal()');
        var shoppinPalMainDiv = angular.element(document.querySelector('.shoppinPal-warehouse'));
        if ($scope.device !== 'ipad') {
          console.log('binding to `mousedown` event for anything non-iPad');
          shoppinPalMainDiv.bind('mousedown', function (event) {
            if (!event.target.classList.contains('editable-panel')) {
              $scope.dismissEdit(row);
              console.log('UN-binding `mousedown` event for anything non-iPad');
              shoppinPalMainDiv.unbind('mousedown');
            }
          });
        } else {
          bindToDismissForIPad($scope, shoppinPalMainDiv, row);
        }
      };

      // DEPRECATED: leaving it behind in case it helps someone understand something better
      /*var bindToDismissForIPad_DEPRECATED = function($scope, shoppinPalMainDiv, row){
        shoppinPalMainDiv.bind('touchstart', function (event) {
          if (!event.target.classList.contains('editable-panel')) {
            $scope.dismissEdit(row);
            shoppinPalMainDiv.unbind('touchstart');
          }
        });
      };*/

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
       * @param row
       */
      var bindToDismissForIPad = function($scope, shoppinPalMainDiv, row){
        console.log('binding to `touchstart` event for iPad');
        shoppinPalMainDiv.bind('touchstart', function(event) {
          if (!event.target.classList.contains('editable-panel')) {
            console.log('binding to `touchend` and `touchmove` events for iPad');
            shoppinPalMainDiv.bind('touchend', function (event) {
              if (!event.target.classList.contains('editable-panel')) {
                console.log('UN-binding `touchend`, `touchmove` and `touchstart` events for iPad');
                $scope.dismissEdit(row);
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

      var handleNittyGrittyStuffForDismissingEditableRow = function($scope) {
        console.trace('handleNittyGrittyStuffForDismissingEditableRow',
          '\n\t > remove the bindings that were meant to kick off backend-persistance for the editable row');
        var shoppinPalMainDiv = angular.element(document.querySelector('.shoppinPal-warehouse'));
        if($scope.device !== 'ipad') {
          console.log('handleNittyGrittyStuffForDismissingEditableRow',
            '\n\t > UN-binding `mousedown` event for anything non-iPad');
          shoppinPalMainDiv.unbind('mousedown');
        } else {
          console.log('handleNittyGrittyStuffForDismissingEditableRow',
            '\n\t > UN-binding `touchstart` event for iPad');
          shoppinPalMainDiv.unbind('touchstart');
        }

        console.log('handleNittyGrittyStuffForDismissingEditableRow',
          '\n\t > dismiss the edit view in UI');
        $scope.selectedRowIndex = $scope.storereportlength + 1;
      };

      /** @method limitListAsPerSupplier
       * creates filtered list based on individual supplier limit size
       */
      var limitListAsPerSupplier = function($scope){
        var suppliers = [];
        // extract all the suppliers through out the reports list
        angular.forEach($scope.reportLists, function(report) {
          if(suppliers.indexOf(report.supplier.name) < 0) {
            suppliers.push(report.supplier.name);
            if(!$scope.supplierWiseListSize[report.supplier.name]) {
              // set the list size per supplier, for show more feature
              $scope.supplierWiseListSize[report.supplier.name] = {size: $scope.showMoreValue, enabled: true};
            }
          }
        });

        var filteredLists = [];
        // find the supplier wise list limited to the list size value
        angular.forEach($scope.supplierWiseListSize, function(supplier, key) {
          // filter based on current supplier eg: CSC
          $scope.currentSupplier = key;
          var array = $filter('filter')($scope.reportLists, function supplierFilter(report) {
            return report.supplier.name === $scope.currentSupplier;
          });
          // disable show more link (for individual supplier) if there is no more item to show
          if(array.length <= supplier.size) {
            supplier.enabled = false;
          } else {
            supplier.enabled = true;
          }
          // filter based on the supplier list size
          array = $filter('limitTo')(array, supplier.size * -1);
          angular.forEach(array, function(report) {
            filteredLists.push(report);
          });
        });
        $scope.filteredLists = angular.copy(filteredLists);
      };

      var lookupAndAddProductBySku = function($scope, $stateParams, ngDialog, ReportModel, cb){
        $scope.sku = {value:null};
        $scope.lookupBySku = function(closeDialogMethod) {
          // NOTES: In vend, each 'Variant' which is grouped together,
          //        requires the same 'handle', and a unique SKU per variant.
          console.log('will lookup sku:', $scope.sku.value);
          ReportModel.lookupAndAddProductBySku({
            id: $stateParams.reportId,
            boxNumber: ($scope.selectedBox) ? $scope.selectedBox.boxNumber : null,
            sku: $scope.sku.value
          })
            .$promise.then(function(stockOrderLineitemModelInstance){
              console.log('stockOrderLineitemModelInstance:', stockOrderLineitemModelInstance);
              cb(closeDialogMethod, stockOrderLineitemModelInstance);
            })
            .catch(function(error){
              if(error && error.data && error.data.error && error.data.error.message) {
                console.error(error.data.error.message);
                $spAlerts.addAlert(error.data.error.message, 'error');
              }
              else {
                console.error(error);
                $spAlerts.addAlert('Something went wrong! Try again or report to an admin.', 'error');
              }
              return false;
            });
        };
        $scope.selectSku = function() {
          var dialog = ngDialog.open({ template: 'views/popup/addProductBySku.html',
            className: 'ngdialog-theme-plain',
            scope: $scope
          });
          dialog.closePromise.then(function (data) {
            console.log('arguments', arguments);
            var proceed = data;
            if (proceed) {
              console.log('is there no point in coding up this block?');
            }
          });
        };
      };

      // AngularJS will instantiate a singleton by calling 'new' on this function
      return {
        bindToTrackDismissal: bindToTrackDismissal,
        bindToDismissForIPad: bindToDismissForIPad,
        handleNittyGrittyStuffForDismissingEditableRow: handleNittyGrittyStuffForDismissingEditableRow,
        limitListAsPerSupplier: limitListAsPerSupplier,
        lookupAndAddProductBySku: lookupAndAddProductBySku
      };
    }
  ]);
