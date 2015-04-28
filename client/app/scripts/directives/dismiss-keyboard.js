'use strict';

/**
 * @ngdoc directive
 * @name ShoppinPalApp.directive:dismissKeyboard
 * @description
 * # dismissKeyboard
 * Directive of the ShoppinPalApp
 */
angular.module('ShoppinPalApp')
 .directive('dismissKeyboard', function() {
 	return function (scope, element, attr) {
     element.find('input[type=text]').blur;
     console.log('form was submitted');
     event.preventDefault();
 	};
 });