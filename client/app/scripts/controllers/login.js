'use strict';

/**
 * @ngdoc function
 * @name ShoppinPalApp.controller:LoginCtrl
 * @description
 * # LoginCtrl
 * Controller of the ShoppinPalApp
 */
angular.module('ShoppinPalApp')
  .controller('LoginCtrl',['$scope','$state',
    function ($scope, $state){

    $scope.userName ='';
    $scope.password ='';

    $scope.login = function () {

        // validate login and transition to select store page
        $state.go('store-report-manager');
      };

  }
  ]
  );
