'use strict';

/**
 * @ngdoc function
 * @name ShoppinPalApp.controller:StoreLandingCtrl
 * @description
 * # StoreLandingCtrl
 * Controller of the ShoppinPalApp
 */
angular.module('ShoppinPalApp')
  .controller('StoreLandingCtrl', ['$scope','$anchorScroll','$location',
     '$state', 'UserModel', 'LoopBackAuth', 'StoreModel', 'ReportModel','$filter',
    function($scope, $anchorScroll, $location, $state,
              UserModel, LoopBackAuth, StoreModel, ReportModel,$filter) {

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
      $scope.dismissEdit = function() {
        $scope.selectedRowIndex = $scope.storereportlength + 1;
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
