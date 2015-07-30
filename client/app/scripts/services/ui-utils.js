'use strict';

/**
 * @ngdoc service
 * @name ShoppinPalApp.loginService
 * @description
 * # loginService
 * Service in the ShoppinPalApp.
 */
angular.module('ShoppinPalApp')
  .service('uiUtils', [
    '$http', /* angular's modules/services/factories etc. */
    'ReportModel', /* loopback models */
    function ()
    {

      /**
       * Motivation:
       *   (1) Initially we were only binding on the `touchstart` event
       *       so that a user may dismiss the editable row by touching outside of it.
       *   (2) But that led to a problem where scrolling led to
       *       an editable row being dismissed!
       *   (3) So the solution was expanded to also bind `touchend` and `touchmove`
       *       `Touchend` does whatever we would want a `touchstart` to do and then unbinds itself
       *       `Touchmove` basically does nothing except unbind `Touchend`
       *
       *       This results in us being able to scroll without issues and a user can
       *       still dismiss the editable row by touching outside of it.
       *
       *       Reference:
       *         http://stackoverflow.com/questions/9842587/stop-the-touchstart-performing-too-quick-when-scrolling
       *
       *  Question:
       *    (1) Why not do something similar for desktop?
       *        We could but most people don't click to scroll anymore,
       *        they use the scrollwheel so we are only focusing on the
       *        minimum-viable-product for now. Until a real user actually
       *        requests for an enhancement.
       * @param shoppinPalMainDiv
       * @param storeReportRow
       */
      var bindToDismissForIPad = function($scope, shoppinPalMainDiv, storeReportRow){
        console.log('binding to `touchstart` event for iPad');
        shoppinPalMainDiv.bind('touchstart', function(event) {
          if (!event.target.classList.contains('editable-panel')) {
            console.log('binding to `touchend` and `touchmove` events for iPad');
            shoppinPalMainDiv.bind('touchend', function (event) {
              if (!event.target.classList.contains('editable-panel')) {
                console.log('UN-binding `touchend`, `touchmove` and `touchstart` events for iPad');
                $scope.dismissEdit(storeReportRow);
                shoppinPalMainDiv.unbind('touchend');
                shoppinPalMainDiv.unbind('touchmove');
                shoppinPalMainDiv.unbind('touchstart');
              }
            });
            shoppinPalMainDiv.bind('touchmove', function (event) {
              if (!event.target.classList.contains('editable-panel')) {
                console.log('UN-binding `touchend` and `touchmove` events for iPad');
                shoppinPalMainDiv.unbind('touchend');
                shoppinPalMainDiv.unbind('touchmove');
              }
            });
          }
        });
      };

      // AngularJS will instantiate a singleton by calling 'new' on this function
      return {
        bindToDismissForIPad: bindToDismissForIPad
      };
    }
  ]);
