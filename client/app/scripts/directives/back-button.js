'use strict';

/**
 * @ngdoc directive
 * @name ShoppinPalApp.directive:backButton
 * @description
 * # backButton
 * Directive of the ShoppinPalApp
 */
angular.module('ShoppinPalApp')
  .directive('backButton', function($window) {
    return {
        restrict: 'E',
        template: '<button class="btn btn-primary back-button">{{back}}</button>',
        scope: {
            back: '@back'
          },
          link: function(scope, element) {
            element.on('click', function() {
              $window.history.back();
            });
          }
        };
  });