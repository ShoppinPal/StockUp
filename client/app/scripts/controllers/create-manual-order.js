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
    '$spAlerts', 'LoopBackAuth', 'SupplierModel', 'UserModel', 'ReportModel', 'StoreModel', /* shoppinpal's custom modules/services/factories etc. */
    'FileUploader', /* 3rd party modules/services/factories etc. */
    'ReportModelStates', /* constants */
    function CreateManualOrderCtrl($sessionStorage, $state,
                                   $spAlerts, LoopBackAuth, SupplierModel, UserModel, ReportModel, StoreModel,
                                   FileUploader,
                                   ReportModelStates) {
      var self = this;

      this.storeName = ($sessionStorage.currentStore) ? $sessionStorage.currentStore.name : null;
      this.roles = $sessionStorage.roles;
      this.suppliers = [];
      this.stores = [];
      this.createSales = true;

      this.validUpload = true;

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

      // known UX issue: https://github.com/nervgh/angular-file-upload/issues/489
      this.uploader = new FileUploader({
        url: 'api/containers/' + LoopBackAuth.currentUserId + '/upload',
        formData: [],
        filters: [{
          name: 'singleFileOnly',
          fn: function () {
            if (this.queue.length === 1) {
              console.log('applying singleFileOnly filter');
              this.clearQueue();
            }
            return true;
          }
        }],
        removeAfterUpload: true
      });
      this.uploader.onBeforeUploadItem = function (item) {
        item.formData.push({
          createSales: self.createSales,
          supplierId: (self.selectedSupplier) ? self.selectedSupplier.id : undefined,
          storeOutletId: self.selectedStore.objectId,
          warehouseOutletId: self.selectedWarehouse.objectId
        });
      };
      this.uploader.onSuccessItem = function () {
        console.log('this.uploader.onSuccessItem() > ' +
          'since we have kicked off the work, let\'s go back to the landing page based on the user\'s role');
        return $state.go(self.homeState);
      };
      this.uploader.onErrorItem = function (fileItem, response, status/*, headers*/) {
        console.log('onErrorItem', fileItem.file.name, status);
        console.log(response);

        // show something in the UI too
        var error = response.error;
        if (error && error.message) {
          console.error(error.message);
          $spAlerts.addAlert(error.message, 'error', 10000);
        }
        else {
          console.error(error);
          $spAlerts.addAlert('Something went wrong! Try again or report to an admin.', 'error', 10000);
        }
      };

      this.uploader.onAfterAddingFile = function (fileItem) {
        var filename = fileItem.file.name;
        var re = /(?:\.([^.]+))?$/;
        var fileExtension = re.exec(filename);

        if (fileExtension[1].toLowerCase() === 'csv') {
          var slicedFilename = filename.slice(0, -4);
          var data = slicedFilename.split('-');
          if (data[0] !== undefined && data[1] !== undefined) {

            var storeName = data[0];
            storeName = storeName.replace(/_/g, ' '); // . is treated as regex when

            var supplierName = data[1];
            supplierName = supplierName.replace(/_/g, ' '); // . is treated as regex when

            if (storeExists(storeName, self.stores)) {

              self.selectedStore = self.stores.find(function (eachStore) {
                return eachStore.name === storeName;
              });
              if (supplierExists(supplierName, self.suppliers)) {

                self.selectedSupplier = self.suppliers.find(function (eachSupplier) {
                  return eachSupplier.name === supplierName;
                });

                self.validUpload = true;
              }
            }
          }
        }
        else if (fileExtension[1].toLowerCase() === 'xls' || fileExtension[1].toLowerCase() === 'xlsx') {
          self.validUpload = true;
        }
      };

      var storeExists = function (storeName, array) {
        var i = null;
        for (i = 0; array.length>i; i += 1) {
          if (array[i].name === storeName) {
            return true;
          }
        }
        return false;
      };

      var supplierExists = function (supplierName, array) {
        var i = null;
        for (i = 0; array.length>i; i += 1) {
          if (array[i].name === supplierName) {
            return true;
          }
        }
        return false;
      };

      // Load the data
      this.waitOnPromise = SupplierModel.listSuppliers({id:LoopBackAuth.currentUserId})
        .$promise.then(function (response) {
          self.suppliers = response;
          var aPromise = null;
          if (self.isWarehouser()) {
            aPromise = StoreModel.listStores({id: LoopBackAuth.currentUserId}).$promise;
          }
          else {
            aPromise = UserModel.storeModels({id: LoopBackAuth.currentUserId}).$promise;
          }
          return aPromise.then(function (response) {
            self.stores = response;
            if (self.stores && self.stores.length>0) {
              self.selectedWarehouse = self.stores.find(function (eachStore) {
                return eachStore.isWarehouse === true;
              });
            }
          });
        });

      /** @method generateOrder
       * This method will move to generate store report for particular store
       */
      this.generateOrder = function () {
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
          .$promise.then(function (reportModelInstance) {
            //return Parse.Promise.as(reportModelInstance);
            console.log(reportModelInstance);
            return ReportModel.generateStockOrderReportForManager(
              {
                id: reportModelInstance.id
              },
              function (response) {
                console.log(response);
                console.log('since we have kicked off the work, let\'s go back to the landing page based on the user\'s role');
                return $state.go(self.homeState);
              },
              function (err) {
                console.error(err);
                // TODO: @ayush - show a friendly error to user somehow
              });
          });
      };

      // ====================================================
      // Alert code which cannot be directly called from HTML
      // ====================================================
      this.closeAlert = function (index) {
        console.log('calling closeAlert() from create-manual-order.js');
        $spAlerts.closeAlert(index);
      };

    }
  ]);
