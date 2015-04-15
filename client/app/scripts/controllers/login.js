'use strict';

/**
 * @ngdoc function
 * @name ShoppinPalApp.controller:LoginCtrl
 * @description
 * # LoginCtrl
 * Controller of the ShoppinPalApp
 */
angular.module('ShoppinPalApp')
  .controller('LoginCtrl',[
    '$scope', '$sessionStorage', '$state', /* angular's modules/services/factories etc. */
    'UserModel', /* loopback models */
    function ($scope, $sessionStorage, $state,
              UserModel)
    {

      $scope.userName ='';
      $scope.password ='';

      // validate login and transition to select store page
      $scope.login = function login(){
        // Reference: http://docs.strongloop.com/display/public/LB/Logging+in+users
        UserModel.login({
          realm: 'portal',
          username: $scope.userName,
          password: $scope.password
        })
          .$promise.then(function(accessToken){
            console.log('accessToken', accessToken);
            $sessionStorage.currentUser = accessToken;
            console.log('sessiontoken:', $sessionStorage.currentUser.id);
            $state.go('store-report-list');
          },
          function(error){
            console.log('login() failed');
            console.log(error);
            if (error && error.data && error.data.error) {
              //TODO: @afzal and @chhaya - show an error to user
            }
          });
      };

    }
  ]
);
