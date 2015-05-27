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
    'UserModel', 'deviceDetector', /* loopback models */
    function ($scope, $sessionStorage, $state,
              UserModel, deviceDetector)
    {

      $scope.userNameWindow = '';
      $scope.passwordWindow = '';

      $scope.userNameIos = '';
      $scope.passwordIos = '';
      $scope.deviceDetector = deviceDetector;

      // $scope.appendText = function(event,id){
      //    // var target = event.target;
      //    //  target.blur();
      //    //  $scope.apply();
      //    //  angular.element(id).blur();
      //   // event.target.blur();
      //    event.preventDefault();
      //    // console.log(event.target);
      //   // var value = String.fromCharCode(event.keyCode);
      //   //  if(id == 'userName'){
      //   //      $scope.userName += value;
      //   //  }
      //   //  if(id == 'password'){
      //   //     $scope.password += value;
      //   //  }
      //    // console.log("keypress",value);
      //    //  console.log("id",id);
      // };
      
      // validate login and transition to select store page
      $scope.login = function login(username, password){

        UserModel.login({
          realm: 'portal',
          username: username,
          password: password
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

       $scope.$on('$viewContentLoaded', function() {
        $scope.deviceOS = $scope.deviceDetector.os;
       });

    }
  ]);
