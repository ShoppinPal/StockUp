'use strict';

angular.module('sp-alerts', ['ngStorage'])
  .factory('$spAlerts',
  ['$rootScope', '$sessionStorage', '$timeout','$interval',
    function($rootScope, $sessionStorage, $timeout, $interval) {

      $rootScope.alerts = $sessionStorage.alerts;

      // TODO: A beautiful look for the countdown timer could be added to the HTML elements
      //       (a) which use this factory by leveraging, this angular+grunt component:
      //             http://siddii.github.io/angular-timer/index.html#/countdown-timer
      //       (b) alternatively, I really like the countdown style animation here:
      //             http://hackedbychinese.github.io/ng-idle/
      //           we could pick & choose to only use its ng-idle-countdown="countdown" directive
      //           but then I don't see an option to let the users explicitly close a message
      //           if they don't want to wait for the countdown to finish.

      $rootScope.countdownInMilliSeconds = 5000;

      function addAlert(alertMessage, alertType, hideAfterXMilliSeconds) {
        var alert = {msg: alertMessage, type: alertType};
        $sessionStorage.alerts.push(alert);
        alert.index = $sessionStorage.alerts.length - 1; // zero-based index

        $rootScope.countdownInMilliSeconds = hideAfterXMilliSeconds || 5000 ;

        alert.timeoutPromise = $timeout(
          function(){
            console.log('sanity check - timeoutPromise() this should not run forever');
            onTimeout(alert);
          }, 1000);
      }

      function onTimeout(alert){
        $rootScope.countdownInMilliSeconds = $rootScope.countdownInMilliSeconds - 1000;
        console.log('countdownInMilliSeconds', $rootScope.countdownInMilliSeconds);
        if ($rootScope.countdownInMilliSeconds > 0) {
          console.log('next countdownInMilliSeconds', $rootScope.countdownInMilliSeconds);
          alert.timeoutPromise = $timeout(
            function(){
              console.log('sanity check - timeoutPromise() this should not run forever');
              onTimeout(alert);
            }, 1000);
        }
        else {
          console.log('last countdownInMilliSeconds', $rootScope.countdownInMilliSeconds);
          // Implementation Detail: this could just be closeAlert() but doing it this way
          //                        allows e2e protractor tests that check the content of
          //                        the div's error message ... to succeed!
          alert.intervalPromise = $interval(
            function(){
              console.log('sanity check - intervalPromise() this should not run forever');
              //closeAlert(alert.index, alert);
              closeAlert(null, alert);
            }, 1000);
        }
      }

      function closeAlert(index, alert) {
        console.log('will remove data at index: ' + index + ', out of current ' + $sessionStorage.alerts.length + ' alerts.');

        if (!index) {
          index = $sessionStorage.alerts.indexOf(alert); // TODO: doesn't really find anything properly
          console.log('determined index for alert to be at: ' + index);
        }

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

        $sessionStorage.alerts.splice(index||0, 1);
        console.log('$sessionStorage.alerts.length: ' + $sessionStorage.alerts.length);
      }

      function getMessage(error) {
        /* jshint camelcase: false */
        var errorMessage = null;
        if ( _.isObject(error) ) {
          //console.log('_.isObject(error): true');
          if (error.code && (error.error|| error.message) ) {
            //console.log('getMessage(error.error)');
            errorMessage = getMessage(error.error || error.message);
          }
          else if (_.isArray(error) && error.length>0) {
            if (error[0].text){
              //console.log('getMessage(error[0].text);');
              errorMessage = getMessage(error[0].text);
            } else {
              //console.log(error);
              errorMessage = JSON.stringify(error,null,2);
            }
          }
          else if (error.error_description) {
            //console.log('getMessage(error.error_description)');
            errorMessage = getMessage(error.error_description);
          }
          else if (error.data) {
            //console.log('getMessage(error.data)');
            errorMessage = getMessage(error.data);
          }
          else {
            //console.log(error);
            errorMessage = JSON.stringify(error,null,2);
          }
        }
        else if ( _.isString(error) ) {
          //console.log('_.isString(error): true');
          try {
            //console.log('JSON.parse(error)');
            var errorAsObject = JSON.parse(error);
            //console.log('getMessage(errorAsObject)');
            errorMessage = getMessage(errorAsObject);
          } catch(e) {
            //console.log(e);
            //console.log('we know for sure that its a string, not an object');
            errorMessage = error;
          }
        }
        //console.log('returning errorMessage\n' + errorMessage);
        return errorMessage;
      }

      return {
        addAlert: addAlert,
        closeAlert: closeAlert,
        getMessage: getMessage
      };
    }
  ]);
