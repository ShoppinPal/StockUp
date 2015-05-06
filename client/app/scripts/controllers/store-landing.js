'use strict';

/**
 * @ngdoc function
 * @name ShoppinPalApp.controller:StoreLandingCtrl
 * @description
 * # StoreLandingCtrl
 * Controller of the ShoppinPalApp
 */
angular.module('ShoppinPalApp')
    .controller('StoreLandingCtrl', ['$scope', 'loginService',
        function($scope, loginService) {

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
                    });
            });

        }
    ]);
