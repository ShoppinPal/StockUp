'use strict';

/**
 * @ngdoc service
 * @name ShoppinPalApp.loginService
 * @description
 * # loginService
 * Service in the ShoppinPalApp.
 */
angular.module('ShoppinPalApp')
  .service('loginService', function ($http) {
    // AngularJS will instantiate a singleton by calling 'new' on this function
  return {
    
    /**
      * @method getSelectStore
      * Get all selected stores
      */
    getSelectStore : function () {
      return $http({
        url: 'scripts/json/stores.json',
        method: 'GET'
        }).then(function (response) {
          return response;
        },
         function (error) {
          alert('Somthing went wrong.');
        });
    },

    /**
      * @method getStoreReport
      * Get stores report
      */ 
    getStoreReport: function () {
        return $http({
        url: 'scripts/json/storesReport.json',
        method: 'GET'
       }).then(function (response) {
         return response;
        },
       function (error) {
          alert('Somthing went wrong.');
       });
    }
    };  
});
