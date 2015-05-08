'use strict';

/**
 * @ngdoc function
 * @name ShoppinPalApp.controller:WarehouseLandingCtrl
 * @description
 * # WarehouseLandingCtrl
 * Controller of the ShoppinPalApp
 */
angular.module('ShoppinPalApp')
    .controller('createManualOrderCtrl', ['$scope', function($scope) {

    $scope.myFile ="No file chosen";	
        $scope.show = function() {
            alert($scope.date);
        };
  
  /** @method importOrder
    * This method import manular order
    */
    $scope.importOrder = function(){
    	console.log("DDDDDDDDDDDDD==========>>"+$scope.myFile);
    };  

}]);
