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
        storeName: '@',
        button1Label: '@',
        button1Class: '@',
        button2Label: '@',
        button2Class: '@',
        onButton1Click: '&',
        onButton2Click: '&'
      }
    };
  });
