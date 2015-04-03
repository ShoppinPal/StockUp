'use strict';

angular.module('ShoppinPalApp', [
    'ui.bootstrap'
    ,'ngCookies'
    ,'ngResource'
    ,'ngSanitize'
    ,'ui.router'
    ,'geocoder'
    ,'google-maps'
    ,'shoppinpal-loopback'
    ,'shoppinpal-utils'
    ,'shoppinpal-vend'
    ,'shoppinpal-prestashop'
    ,'ngStorage'
    ,'ui.utils'
    ,'cgBusy'
    ,'shoppinpal-constants'
    ,'sp-formatters'
    ,'sp-alerts'
    ,'uuid4'
  ])

  .config([
    '$stateProvider', '$urlRouterProvider', 'LoopBackResourceProvider', 'baseUrl', 'loopbackApiRoot',
    function ($stateProvider, $urlRouterProvider, LoopBackResourceProvider, baseUrl, loopbackApiRoot) {
      $stateProvider
        .state('signup', {
          url: '/signup',
          templateUrl: 'views/signup.html',
          controller: 'SignupCtrl',
          authenticate: false
        })
        .state('mystores', {
          url: '/mystores',
          templateUrl: '../views/mystores.html',
          controller: 'MyStoresCtrl',
          authenticate: true
        })
        .state('logout', {
          url: '/logout',
          controller: 'LogoutCtrl'
        })
        .state('onboarding', {
          url: '/onboarding/:storeConfigId/:pos',
          templateUrl: '../views/onboarding.html',
          controller: 'OnboardingCtrl',
          authenticate: true
        })
        .state('login', {
          url: '/login',
          templateUrl: '../views/login.html',
          controller: 'LoginCtrl',
          authenticate: false
        })
        .state('/select-store', {
          url: '/select-store',
          templateUrl: '../views/select-store.html',
          controller: 'SelectStoreCtrl',
          authenticate: false
        });

      $urlRouterProvider.otherwise('/login');

      // Configure backend URL
      LoopBackResourceProvider.setUrlBase(baseUrl + loopbackApiRoot);
    }
  ])

  .run(['$rootScope', '$sessionStorage', '$state', '$timeout', '$interval',
    function($rootScope, $sessionStorage, $state, $timeout, $interval){

      $rootScope.$on('$stateChangeStart', function(event, toState){
        if(toState.authenticate && !$sessionStorage.currentUser) {
          $state.go('signup');
          event.preventDefault();
        }
      });

      // reference: https://github.com/angular-ui/ui-router/issues/92
      $rootScope.$on('$stateChangeSuccess', function (event, toState, toParams, fromState) {
        //console.log('fromState.name: ' + fromState.name);
        //console.log('toState.name: ' + toState.name);
        if (fromState.name !== toState.name) {
          $state.previous = fromState;
        }

        // Implementation Detail: I wanted to use $spAlerts.close() but could not
        //                        inject $spAlerts into .run([...]) ... could this have
        //                        something to do with the following?
        //                        "You can only inject instances (not Providers) into run blocks"

        // Clear out the last notification whenever the route/state changes.
        if ($sessionStorage.alerts.length > 0) {
          var alert = null;
          var index = 0;
          if (!alert) {
            alert = $sessionStorage.alerts[index];
            console.log('since user clicked close explicitly, we will access the alert based on index #');
          }
          if(alert && alert.timeoutPromise) {
            console.log(alert.timeoutPromise);
            $timeout.cancel(alert.timeoutPromise);
          }
          if(alert && alert.intervalPromise) {
            console.log(alert.intervalPromise);
            $interval.cancel(alert.intervalPromise);
          }
          // TODO: the last two notifications get cleared because "$stateChangeSuccess" event fires twice :(
          $sessionStorage.alerts.splice(index||0, 1);
        }
      });

      $sessionStorage.alerts = []; // resets everything on refresh unlike $sessionStorage.currentUser
    }
  ]);
