'use strict';

/**
 * @ngdoc function
 * @name ShoppinPalApp.controller:StoreReportListCtrl
 * @description
 * # SelectStoreCtrl
 * Controller of the ShoppinPalApp
 */
angular.module('ShoppinPalApp')
  .controller('StoreReportListCtrl',[
    '$scope', '$state',
    'UserModel', 'LoopBackAuth', 'StoreModel', 'ReportModel',
    function ($scope, $state,
              UserModel, LoopBackAuth, StoreModel, ReportModel)
    {
      $scope.reportList = [
        'GlenStone - Mon 5th Apr 2015',
        'GlenStone - Fri 9th Jun 2015',
        'GlenStone - Tue 20th Nov 2015',
        'GlenStone - Wed 21st Nov 2015'
      ];

      /** @method generateOrder
       * This method will move to generate store report for particular store
       */
      $scope.generateOrder = function(){
        return UserModel.reportModels.create(
          {id: LoopBackAuth.currentUserId},
          {
            state: 'empty',
            outlet: {
              id: 'aea67e1a-b85c-11e2-a415-bc764e10976c',
              name: 'OKC'
            },
            supplier: {
              id: 'c364c506-f8f4-11e3-a0f5-b8ca3a64f8f4',
              name: 'FFCC'
            }
          }
        )
          .$promise.then(function(reportModelInstance){
            //return Parse.Promise.as(reportModelInstance);
            console.log(reportModelInstance);
            ReportModel.generateStockOrderReportForManager(
              {
                id: reportModelInstance.id
              },
              function(response){
                console.log(response);
                //$state.go('store-report-manager');
              },
              function(err){
                console.error(err);
              });
          });
      };

    }
  ]);
