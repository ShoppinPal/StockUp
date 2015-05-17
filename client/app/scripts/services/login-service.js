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
        getSelectStore: function () {
          return $http({
            url: 'scripts/json/storesReport.json',
            method: 'GET'
          }).then(function (response) {
              return response.data.storesReport;
            },
            function (error) {
              alert('Something went wrong.');
              console.error(error);
            });
        },
         /**
         * @method getSelectStore
         * Get all selected stores
         */
        getSelectStoreStatus: function () {
          return $http({
            url: 'scripts/json/storesReportLanding.json',
            method: 'GET'
          }).then(function (response) {
              return response;
            },
            function (error) {
              alert('Something went wrong.');
              console.error(error);
            });
        },

        /**
         * @method getStoreReport
         * Get stores report
         */
        getStoreReport: function (reportId) {
          return ReportModel.findById({
            id: reportId,
            filter: {
              include: {
                relation: 'stockOrderLineitemModels'/*,
                scope: {
                  skip: 0,
                  limit: 500
                }*/ /*TODO: use count() to determine total # of pages*/
              }
            }
          })
            .$promise.then(function (data) {
              console.log('data:\n' + JSON.stringify(data, null, 2));
              //console.log('data.stockOrderLineitemModels():\n' + JSON.stringify(data.stockOrderLineitemModels(),null,2));
              console.log('data.stockOrderLineitemModels:\n' + JSON.stringify(data.stockOrderLineitemModels, null, 2));
              return data.stockOrderLineitemModels;
            },
            function (error) {
              alert('Something went wrong.');
              console.log(error);
            });
        }
      };

    }

  ]);
