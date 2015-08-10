'use strict';

/**
 * @ngdoc function
 * @name ShoppinPalApp.controller:CreateManualOrderCtrl
 * @description
 * # CreateManualOrderCtrl
 * Controller of the ShoppinPalApp
 */
angular.module('ShoppinPalApp').controller(
  'CreateManualOrderCtrl',
  [
    '$sessionStorage', '$state', /* angular's modules/services/factories etc. */
    'LoopBackAuth', 'SupplierModel', 'UserModel', 'ReportModel', 'StoreModel', /* shoppinpal's custom modules/services/factories etc. */
    'ReportModelStates', /* constants */
    function CreateManualOrderCtrl (
      $sessionStorage, $state,
      LoopBackAuth, SupplierModel, UserModel, ReportModel, StoreModel,
      ReportModelStates)
    {
      var self = this;

      this.storeName = ($sessionStorage.currentStore) ? $sessionStorage.currentStore.name : null;
      this.roles = $sessionStorage.roles;
      this.suppliers = [];
      this.stores = [];


      this.isWarehouser = function () {
        return _.contains(self.roles, 'admin');
      };

      this.isManager = function () {
        return _.contains(self.roles, 'manager');
      };

      this.isReceiver = function () {
        return _.contains(self.roles, 'manager');
      };

      this.homeState = this.isWarehouser() ? 'warehouse-landing' : 'store-landing';

      // Load the data
      SupplierModel.listSuppliers({})
        .$promise.then(function(response) {
          self.suppliers = response;
          if(self.suppliers && self.suppliers.length > 0) {
            self.selectedSupplier = self.suppliers[0];
          }

          var aPromise = null;
          if(self.isWarehouser()){
            aPromise = StoreModel.listStores({id: LoopBackAuth.currentUserId}).$promise;
          }
          else
          {
            aPromise = UserModel.storeModels({id: LoopBackAuth.currentUserId}).$promise;
          }
          aPromise.then(function(response){
              self.stores = response;
              if(self.stores && self.stores.length > 0) {
                self.selectedStore = self.stores[0];
              }
            });
        });

      /** @method generateOrder
       * This method will move to generate store report for particular store
       */
      this.generateOrder = function(){
        console.log('inside generateOrder()',
          '\norderName', this.orderName,
          '\nselectedStoreId', this.selectedStore.api_id, // jshint ignore:line
          '\nselectedSupplierId', this.selectedSupplier.apiId
        );
        this.waitOnPromise = UserModel.reportModels.create(
        {id: LoopBackAuth.currentUserId},
          {
            name: self.orderName,
            state: ReportModelStates.REPORT_EMPTY,
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
            return ReportModel.generateStockOrderReportForManager(
              {
                id: reportModelInstance.id
              },
              function(response){
                console.log(response);
                console.log('since we have kicked off the work, let\'s go back to the landing page based on the user\'s role');
                return $state.go(self.homeState);
              },
              function(err){
                console.error(err);
                // TODO: @ayush - show a friendly error to user somehow
              });
          });
      };

    }
  ]);
