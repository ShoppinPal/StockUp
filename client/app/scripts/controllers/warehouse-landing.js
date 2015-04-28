'use strict';

/**
 * @ngdoc function
 * @name ShoppinPalApp.controller:WarehouseLandingCtrl
 * @description
 * # WarehouseLandingCtrl
 * Controller of the ShoppinPalApp
 */
angular.module('ShoppinPalApp')
    .controller('WarehouseLandingCtrl', ['$scope','$state','loginService',
        function($scope, $state, loginService) {

            $scope.sortedOrder =[];

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
                for (var i = 0; i < $scope.storesReportBackupLength-1 ; i++) {
                    if($scope.storesReportBackup[i].status == "inProgress"){
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
                for (var i = 0; i < $scope.storesReportBackupLength-1 ; i++) {
                    if($scope.storesReportBackup[i].status == "pending"){
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
                for (var i = 0; i < $scope.storesReportBackupLength-1 ; i++) {
                    if($scope.storesReportBackup[i].status == "complete"){
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
                $scope.selectedStore = index;
            };

            /** @method viewContentLoaded
             * This method will load the storesReport from api on view load
             */
            $scope.$on('$viewContentLoaded', function() {
                //loginService.getSelectStore()
                loginService.getSelectStoreStatus()
                    .then(function(response) {
                        $scope.storesReport = response.data.storesReport;
                        $scope.storereportlength = $scope.storesReport.length;
                        $scope.storesReportBackup =  $scope.storesReport;
                        $scope.storesReportBackupLength = $scope.storereportlength;
                    });
            });

        }
    ]);
