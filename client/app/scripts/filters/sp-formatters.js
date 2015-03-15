'use strict';

angular.module('sp-formatters', [])
  .filter('phone', function () {
    return function (country, phone) {
      return formatE164(country,phone);
    };
  });