/**
 * TODO: @felippenardi - What would be a good reason to split this into service and controller? Ex:
 *       https://github.com/strongloop/loopback-getting-started-intermediate/blob/master/client/js/controllers/auth.js
 *       https://github.com/strongloop/loopback-getting-started-intermediate/blob/master/client/js/services/auth.js
 */
'use strict';

angular.module('ShoppinPalApp')
  .controller('LogoutCtrl',[
    '$scope', '$sessionStorage', '$state', /* angular's modules/services/factories etc. */
    'UserModel', /* loopback models */
    function ($scope, $sessionStorage, $state,
              UserModel)
    {
      UserModel.logout()
        .$promise.then(function() {
          $scope.socket.close();
          $sessionStorage.currentUser = null;
          $sessionStorage.currentStore = null;
          $sessionStorage.roles = null;
          $state.go('login');
        });
    }
  ]);
