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
     // $scope.reportList = [];
      /* TODO: file an enhancement request w/ loopback,
       *        the argument below shouldn't have to be explicit,
       *        currentUserId should be the default if unspecified
       */
      UserModel.reportModels({id: LoopBackAuth.currentUserId})
        .$promise.then(function(response){
          console.log(response);
          $scope.reportList = response;
        });

      /** @method generateOrder
       * This method will move to generate store report for particular store
       */
      $scope.generateOrder = function(){
        return UserModel.reportModels.create(
          {id: LoopBackAuth.currentUserId},
          {
            state: 'empty',
            /*outlet: { // fermiyontest
              id: 'aea67e1a-b85c-11e2-a415-bc764e10976c',
              name: 'OKC'
            },
            supplier: { // fermiyontest
              id: 'c364c506-f8f4-11e3-a0f5-b8ca3a64f8f4',
              name: 'FFCC'
            }*/
            outlet: { // patricias
              name: 'Reno Gift Shop',
              id: '51c061d2-ac24-11e2-a415-bc764e10976c'
            },
            supplier: { // patricias
              name: 'FFCC',
              id: '504b39c3-a6c4-11e2-a415-bc764e10976c'
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
