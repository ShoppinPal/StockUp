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
    'UserModel', /* shoppinpal's custom modules/services/factories etc. */
    'deviceDetector', /* 3rd party custom modules/services/factories etc. */
    function ($scope, $sessionStorage, $state,
              UserModel,
              deviceDetector)
    {
      $scope.userNameWindow = '';
      $scope.passwordWindow = '';

      $scope.userNameIos = '';
      $scope.passwordIos = '';

      $scope.deviceDetector = deviceDetector;

      $scope.errors = {
        username: '',
        pwd : ''
      };

      // validate login and transition to select store page
      $scope.login = function login(username, password){
        $scope.waitOnPromise = UserModel.login({
          realm: 'portal',
          username: username,
          password: password
        })
          .$promise.then(function(accessToken){
            console.log('accessToken', accessToken);
            $sessionStorage.currentUser = accessToken;
            console.log('sessiontoken:', $sessionStorage.currentUser.id);
            return UserModel.storeModels({id: $sessionStorage.currentUser.userId})
              .$promise.then(function(stores){
                console.log(stores);
                if(stores.length === 1) {
                  $sessionStorage.currentStore = stores[0];
                }
                return UserModel.prototype$__get__roles({id: $sessionStorage.currentUser.userId}) // jshint ignore:line
                  .$promise.then(function(roles){
                    console.log(roles);
                    $sessionStorage.roles = roles;
                    return $state.go('store-landing');
                  });
              });
          },
          function(error){
            console.log('login() failed');
            console.log(error);
            var message = 'An error occured, please contact your administrator...';
            if (error && error.data && error.data.error && error.data.error.message) {
              message = error.data.error.message;
            }
            else if (error && error.data && angular.isString(error.data)) {
              message = error.data;
            }
            else if (error && error.statusText && angular.isString(error.statusText)) {
              message = error.statusText;
            }
            console.log(message);
            $scope.errors.username = message;
            $scope.errors.pwd = message;
          });
      };

      $scope.$on('$viewContentLoaded', function() {
        $scope.device = $scope.deviceDetector.device;
      });

    }
  ]);
