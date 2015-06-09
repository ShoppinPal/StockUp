'use strict';

/**
 * @ngdoc function
 * @name ShoppinPalApp.controller:CreateManualOrderCtrl
 * @description
 * # CreateManualOrderCtrl
 * Controller of the ShoppinPalApp
 */
var CreateManualOrderCtrl = function (
  $sessionStorage,
  LoopBackAuth, SupplierModel, UserModel, ReportModel)
{
  this.storeName = $sessionStorage.currentStore.name;
  this.suppliers = [];
  this.stores = [];
  var self = this;

  /** @method viewContentLoaded
   * This method will load the storesReport from api on view load
   */
  // TODO: ask @felippenardi about $viewContentLoaded
  //$scope.$on('$viewContentLoaded', function() {
  SupplierModel.find({})
    .$promise.then(function(response) {
      self.suppliers = response;
      if(self.suppliers && self.suppliers.length > 0) {
        self.selectedSupplier = self.suppliers[0];
      }

      return UserModel.storeModels({id: LoopBackAuth.currentUserId})
        .$promise.then(function(response){
          self.stores = response;
          if(self.stores && self.stores.length > 0) {
            self.selectedStore = self.stores[0];
          }
        });
    });
  //});

  /** @method generateOrder
   * This method will move to generate store report for particular store
   */
  this.generateOrder = function(){
    console.log('inside generateOrder()',
      '\norderName', this.orderName,
      '\nselectedStoreId', this.selectedStore.api_id, // jshint ignore:line
      '\nselectedSupplierId', this.selectedSupplier.apiId
    );
    return UserModel.reportModels.create(
      {id: LoopBackAuth.currentUserId},
      {
        name: self.orderName,
        state: 'empty',
        outlet: {
          id: self.selectedStore.api_id, // jshint ignore:line
          name: self.selectedStore.name
        },
        supplier: {
          id: self.selectedSupplier.apiId,
          name: self.selectedSupplier.name
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

}; // end of CreateManualOrderCtrl

// TODO: ask @felippenardi about improving this style to consolidate the strings with the function arguments upstairs
angular.module('ShoppinPalApp').controller(
  'CreateManualOrderCtrl',
  [
    '$sessionStorage', /* angular's modules/services/factories etc. */
    'LoopBackAuth', 'SupplierModel', 'UserModel', 'ReportModel', /* shoppinpal's custom modules/services/factories etc. */
    CreateManualOrderCtrl
  ]);
