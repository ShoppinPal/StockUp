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
    function ($scope, $sessionStorage, $state,
              UserModel)
    {
      $scope.userName = '';
      $scope.password = '';
      $scope.errors = {
        username: '',
        pwd : ''
      };

      var clearErrorStates = function(){
        $scope.errors = {};
      };

      // validate login and transition to select store page
      $scope.login = function login(username, password){
        clearErrorStates();
        $scope.waitOnPromise = UserModel.login({
          realm: 'portal',
          username: username,
          password: password
        })
          .$promise.then(function(accessToken){
            console.log('accessToken', accessToken);
            $sessionStorage.currentUser = accessToken;
            $scope.socket.send(JSON.stringify({event: 'USER_AUTHENTICATE', payload: 'test', userId: $sessionStorage.currentUser.userId}));
            console.log('sessiontoken:', $sessionStorage.currentUser.id);
            return UserModel.prototype$__get__roles({id: $sessionStorage.currentUser.userId}) // jshint ignore:line
              .$promise.then(function(roles){
                console.log('roles', roles);
                $sessionStorage.roles = _.pluck(roles,'name');
                console.log('$sessionStorage.roles', $sessionStorage.roles);
                return UserModel.storeModels({id: $sessionStorage.currentUser.userId})
                  .$promise.then(function(stores){
                    console.log('stores', stores);
                    if (_.contains($sessionStorage.roles, 'manager')) {
                      if(stores.length === 1) {
                        $sessionStorage.currentStore = stores[0];
                        return $state.go('store-landing');
                      }
                      else {
                        var message = 'Manager accounts can only have one store assigned to them. ' +
                          'But your account has more than one store so you cannot proceed.' +
                          'Please contact your administrator to get this fixed.';
                        console.log(message);
                        $scope.errors.panel = message;
                      }
                    }
                    else if (_.contains($sessionStorage.roles, 'admin')) {
                      return $state.go('warehouse-landing');
                    }
                    else {
                      return $state.go('logout'); // TODO: pass error code via $stateParams to notify user that no role is assigned
                    }
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

    }
  ]);
