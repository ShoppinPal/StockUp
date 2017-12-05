/**
 * TODO: @felippenardi - What would be a good reason to split this into service and controller? Ex:
 *       https://github.com/strongloop/loopback-getting-started-intermediate/blob/master/client/js/controllers/auth.js
 *       https://github.com/strongloop/loopback-getting-started-intermediate/blob/master/client/js/services/auth.js
 */
'use strict';

angular.module('ShoppinPalApp')
  .controller('LogoutCtrl', [
    '$scope', '$sessionStorage', '$state', /* angular's modules/services/factories etc. */
    'UserModel', /* loopback models */
    function ($scope, $sessionStorage, $state,
              UserModel) {
      UserModel.logout()
        .$promise.then(function () {
        //also logout from warehouse-v2 app
        document.cookie = '$LoopBackSDK$created=;expires=0';
        document.cookie = '$LoopBackSDK$id=;expires=0';
        document.cookie = '$LoopBackSDK$rememberMe=;expires=0';
        document.cookie = '$LoopBackSDK$ttl=;expires=0';
        document.cookie = '$LoopBackSDK$user=;expires=0';
        document.cookie = '$LoopBackSDK$userId=;expires=0';
        $sessionStorage.currentUser = null;
        $sessionStorage.currentStore = null;
        $sessionStorage.roles = null;
        $state.go('login');
      });
    }
  ]);
