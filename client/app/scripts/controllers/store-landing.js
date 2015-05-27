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
    '$scope','$anchorScroll','$location', '$state', '$filter', /* angular's modules/services/factories etc. */
    'UserModel', 'LoopBackAuth', 'StoreModel', 'ReportModel', /* shoppinpal's custom modules/services/factories etc. */
    function($scope, $anchorScroll, $location, $state, $filter,
             UserModel, LoopBackAuth, StoreModel, ReportModel)
    {
      $scope.sortedOrder = [];
      $scope.reportLists = [];
      $scope.backUpReportList = [];

      /** @method editOrder
       * This will edit the order name
       */
      $scope.editOrder = function(index) {
        $scope.selectedRowIndex = index;
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

      /** @method inProcessOrder
       * show only the inprocess order in UI
       */
      $scope.inProcessOrder = function() {
        $scope.reportLists = $filter('filter')($scope.backUpReportList, {state: 'empty'} || {state: 'manager'});
      };

      /** @method newOrders
       * show all newOrders
       */
      $scope.newOrders = function() {
      };

      /** @method recievedOrder
       * show all recieved order
       */
      $scope.recievedOrder = function() {
        $scope.reportLists = $filter('filter')($scope.backUpReportList, {state: 'receive'});
      };

      /** transition to create manual order
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
        UserModel.reportModels({id: LoopBackAuth.currentUserId})
          .$promise.then(function(response){
            $scope.reportLists = response;
            $scope.backUpReportList = response;
          });
      });

    }
  ]);
