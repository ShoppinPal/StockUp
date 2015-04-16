'use strict';

/**
 * @ngdoc service
 * @name ShoppinPalApp.loginService
 * @description
 * # loginService
 * Service in the ShoppinPalApp.
 */
angular.module('ShoppinPalApp')
  .service('loginService', [
    '$http', /* angular's modules/services/factories etc. */
    'ReportModel', /* loopback models */
    function ($http,
              ReportModel)
    {
      // AngularJS will instantiate a singleton by calling 'new' on this function
      return {

        /**
         * @method getSelectStore
         * Get all selected stores
         */
        getSelectStore : function () {
          return $http({
            url: 'scripts/json/storesReport.json',
            method: 'GET'
          }).then(function (response) {
              return response;
            },
            function (error) {
              alert('Somthing went wrong.');
              console.error(error);
            });
        },

        /**
         * @method getStoreReport
         * Get stores report
         */
        getStoreReport: function () {
          return ReportModel.getRows({id:1})// TODO: replace hard-coded id with input from UI
            .$promise.then(function(rows){
              console.log('rows:\n' + JSON.stringify(rows,null,2));
              return rows;
            },
            function (error) {
              alert('Something went wrong.');
              console.log(error);
            });
        }
      };
    }
  ]);
