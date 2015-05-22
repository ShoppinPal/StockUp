'use strict';

/**
 * @ngdoc function
 * @name ShoppinPalApp.controller:WarehouseLandingCtrl
 * @description
 * # WarehouseLandingCtrl
 * Controller of the ShoppinPalApp
 */
angular.module('ShoppinPalApp')
  .controller('WarehouseLandingCtrl', ['$scope', '$state', 'loginService','$anchorScroll'
    ,'$location','UserModel','LoopBackAuth',
    function($scope, $state, loginService, $anchorScroll, $location, UserModel,LoopBackAuth) {

      $scope.sortedOrder = [];

      /** @method dismissEdit
       * This method will close the editable mode in store-report
       */
      $scope.dismissEdit = function(/*storeReportRow*/) {
        $scope.selectedRowIndex = $scope.storereportlength + 1;
      };

      /** @method createManualOrder
       * it will allow the warehouse manager to create manual order
       */
      $scope.createManualOrder = function() {
        $state.go('create-manual-order');
      };

      /** @method inProcessOrder
       * show only the inprocess order in UI
       */
      $scope.inProcessOrder = function() {
        $scope.sortedOrder = [];
        for (var i = 0; i < $scope.storesReportBackupLength - 1; i++) {
          if ($scope.storesReportBackup[i].status === 'inProgress') {
            $scope.sortedOrder.push($scope.storesReportBackup[i]);
          }
        }
        $scope.storesReport = [];
        $scope.storesReport = $scope.sortedOrder;
      };

      /** @method fulfilledOrder
       * show all fullfilled order
       */
      $scope.fulfilledOrder = function() {
        $scope.sortedOrder = [];
        for (var i = 0; i < $scope.storesReportBackupLength - 1; i++) {
          if ($scope.storesReportBackup[i].status === 'pending') {
            $scope.sortedOrder.push($scope.storesReportBackup[i]);
          }
        }
        $scope.storesReport = [];
        $scope.storesReport = $scope.sortedOrder;
      };

      /** @method recievedOrder
       * show all recieved order
       */
      $scope.recievedOrder = function() {
        $scope.sortedOrder = [];
        for (var i = 0; i < $scope.storesReportBackupLength - 1; i++) {
          if ($scope.storesReportBackup[i].status === 'complete') {
            $scope.sortedOrder.push($scope.storesReportBackup[i]);
          }
        }
        $scope.storesReport = [];
        $scope.storesReport = $scope.sortedOrder;
      };

      /** @method importExport
       * @param index
       * on left swipe of store landing page enable export, import for warehouse
       */
      $scope.importExport = function(index) {
        $scope.selectedRowIndex = index;
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
        //loginService.getSelectStore()
        /*loginService.getSelectStoreStatus()
          .then(function(response) {
            $scope.storesReport = response.data.storesReport;
            $scope.storereportlength = $scope.storesReport.length;
            $scope.storesReportBackup = $scope.storesReport;
            $scope.storesReportBackupLength = $scope.storereportlength;
          });*/

        UserModel.reportModels({id: LoopBackAuth.currentUserId})
          .$promise.then(function(response){
            console.log(response);
            $scope.storesReports = response;
          });
      });

    }
  ]);
