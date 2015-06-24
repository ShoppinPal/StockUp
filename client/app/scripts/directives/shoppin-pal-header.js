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
        button2Label: '@',
        button2Class: '@',
        button2Disabled: '&',
        onButton1Click: '&',
        onButton2Click: '&'
      }
    };
  });
