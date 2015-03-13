/**
 * Created by megha on 6/3/14.
 */
'use strict';

angular.module('ShoppinPalApp')
  .controller('LogoutCtrl',
    ['$scope','$sessionStorage','$spUtils', '$state',
      function ($scope, $sessionStorage, $spUtils, $state) { //TODO: hook into loopback logout?
        /* jshint camelcase: false */
        $sessionStorage.currentUser = null;
        $state.go('signup');
      }
    ]
  );


