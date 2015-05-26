'use strict';

/**
 * @ngdoc function
 * @name ShoppinPalApp.controller:LoginCtrl
 * @description
 * # LoginCtrl
 * Controller of the ShoppinPalApp
 *
 * TODO: @felippenardi - What would be a good reason to split this into service and controller? Ex:
 *       https://github.com/strongloop/loopback-getting-started-intermediate/blob/master/client/js/controllers/auth.js
 *       https://github.com/strongloop/loopback-getting-started-intermediate/blob/master/client/js/services/auth.js
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
            $state.go('store-landing');
          },
          function(error){
            console.log('login() failed');
            console.log(error);
            if (error && error.data && error.data.error && error.data.error.message) {
              //TODO: @afzal and @chhaya - show an error to user
              console.log(error.data.error.message);
            }
          });
      };

    }
  ]);
