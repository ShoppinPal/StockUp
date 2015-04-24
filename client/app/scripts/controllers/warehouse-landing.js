'use strict';

/**
 * @ngdoc function
 * @name ShoppinPalApp.controller:WarehouseLandingCtrl
 * @description
 * # WarehouseLandingCtrl
 * Controller of the ShoppinPalApp
 */
angular.module('ShoppinPalApp')
    .controller('WarehouseLandingCtrl', ['$scope', 'loginService',
        function($scope, loginService) {

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
