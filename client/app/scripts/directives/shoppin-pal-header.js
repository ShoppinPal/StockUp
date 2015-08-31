'use strict';

/**
 * @ngdoc directive
 * @name ShoppinPalApp.directive:shoppinPalHeader
 * @description
 * # shoppinPalHeader
 */
angular.module('ShoppinPalApp')
  .directive('shoppinPalHeader', function () {
    return {
      templateUrl: '../views/templates/shoppin-pal-header-template.html',
      restrict: 'E',
      scope: {
        isHomePage: '@',
        homeState: '@',
        storeName: '@',
        button1Label: '@',
        button1Class: '@',
        button1Disabled: '&',
        onButton1Click: '&',
        button2Label: '@',
        button2Class: '@',
        button2Disabled: '&',
        onButton2Click: '&',
        button3Label: '@',
        button3Class: '@',
        button3Disabled: '&',
        onButton3Click: '&'
      }
    };
  });
