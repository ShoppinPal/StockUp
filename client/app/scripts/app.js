'use strict';

angular.module('ShoppinPalApp',[
  'angularFileUpload'
  ,'cgBusy'
  ,'bd.sockjs'
  ,'geocoder'
  ,'mgcrea.ngStrap'
  ,'ngAnimate'
  ,'ngCookies'
  ,'ngDialog'
  ,'ngResource'
  ,'ngSanitize'
  ,'ngStorage'
  ,'ngTouch'
  ,'ng.deviceDetector'
  ,'shoppinpal-constants'
  ,'shoppinpal-loopback'
  ,'shoppinpal-prestashop'
  ,'shoppinpal-utils'
  ,'shoppinpal-vend'
  ,'sp-alerts'
  ,'sp-formatters'
  ,'ui-notification'
  ,'ui.router'
  ,'ui.utils'
])

  .config([
    '$stateProvider', '$urlRouterProvider', 'LoopBackResourceProvider', 'NotificationProvider', 'baseUrl', 'loopbackApiRoot',
    function ($stateProvider, $urlRouterProvider, LoopBackResourceProvider, NotificationProvider, baseUrl, loopbackApiRoot) {
      $stateProvider
        .state('login', {
          url: '/login',
          templateUrl: 'views/login.html',
          controller: 'LoginCtrl',
          authenticate: false
        })
        .state('logout', {
          url: '/logout',
          controller: 'LogoutCtrl'
        })
        .state('mystores', {
          url: '/mystores',
          templateUrl: '../views/mystores.html',
          controller: 'MyStoresCtrl',
          authenticate: true
        })
        .state('onboarding', {
          url: '/onboarding/:storeConfigId/:pos',
          templateUrl: '../views/onboarding.html',
          controller: 'OnboardingCtrl',
          authenticate: true
        })
        .state('store-landing', {
          url: '/store-landing',
          templateUrl: 'views/store-landing.html',
          controller: 'StoreLandingCtrl',
          authenticate: true
        })
        .state('warehouse-landing', {
          url: '/warehouse-landing',
          templateUrl: 'views/warehouse-landing.html',
          controller: 'WarehouseLandingCtrl',
          authenticate: true
        })
        .state('create-manual-order', {
          url: '/create-manual-order',
          templateUrl: 'views/create-manual-order.html',
          controller: 'CreateManualOrderCtrl',
          controllerAs: 'orderController',
          authenticate: true
        })
        .state('store-report-manager', {
          url: '/store-report-manager/:reportId',
          templateUrl: 'views/store-report-manager.html',
          controller: 'StoreManagerCtrl',
          authenticate: true
        })
        .state('store-receiver-report', {
          url: '/store-receiver-report/:reportId',
          templateUrl: 'views/store-receiver-report.html',
          controller: 'StoreReceiverCtrl',
          authenticate: true
        })
         .state('warehouse-report', {
          url: '/warehouse-report/:reportId',
          templateUrl: 'views/warehouse-report.html',
          controller: 'WarehouseReportCtrl',
          authenticate: true
        });

      $urlRouterProvider.otherwise('/login');

      // Configure backend URL
      LoopBackResourceProvider.setUrlBase(baseUrl + loopbackApiRoot);

      NotificationProvider.setOptions({
        delay: 15000,
        startTop: 20,
        startRight: 10,
        verticalSpacing: 20,
        horizontalSpacing: 20,
        positionX: 'right',
        positionY: 'top'
      });
    }
  ])
  .factory('$socket', function (socketFactory) {
    var sockjs = new SockJS('http://52.175.205.186:4000/echo?token=qwerty');
    
      var socket = socketFactory({
        socket: sockjs
      });
      return socket;
  })

  .run(['$rootScope', '$sessionStorage', '$state', '$timeout', '$interval', '$socket',
    function($rootScope, $sessionStorage, $state, $timeout, $interval, $socket){

      // $socket.setHandler('open', function() {
      //   console.log('app.js', 'socket:open', JSON.stringify($socket));
      //   $socket.send(JSON.stringify({event: 'USER_AUTHENTICATE', payload: 'test', userId: 'angular'}));
      // });
      $rootScope.socket = $socket;
      $socket.setHandler('error', function(message) {
        console.error('app.js', 'socket:error', message);
      });

      $socket.setHandler('close', function() {
        console.log('app.js', 'socket:closed');
      });

      $rootScope.$on('$stateChangeStart', function(event, toState){
        if(toState.authenticate && !$sessionStorage.currentUser) {
          $state.go('login');
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
