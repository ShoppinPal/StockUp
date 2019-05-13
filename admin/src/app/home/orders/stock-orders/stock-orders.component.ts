import {Component, OnInit} from '@angular/core';
import {OrgModelApi} from "../../../shared/lb-sdk/services/custom/OrgModel";
import {ActivatedRoute, Router} from '@angular/router';
import {Observable, combineLatest} from 'rxjs';
import {map, mergeMap} from 'rxjs/operators';
import {ToastrService} from 'ngx-toastr';
import {UserProfileService} from "../../../shared/services/user-profile.service";
import {TypeaheadMatch} from 'ngx-bootstrap';
import {FileUploader} from 'ng2-file-upload';
import {LoopBackConfig, LoopBackAuth} from "../../../shared/lb-sdk";
import {constants} from '../../../shared/constants/constants';

@Component({
  selector: 'app-stock-orders',
  templateUrl: './stock-orders.component.html',
  styleUrls: ['./stock-orders.component.scss']
})


export class StockOrdersComponent implements OnInit {

  public userProfile: any;
  public loading = false;
  public filter: any = {};
  public generatedOrders: Array<any>;
  public totalGeneratedOrders: number;
  public totalGeneratedOrdersPages: number;
  public currentPageGeneratedOrders: number = 1;
  public receiveOrders: Array<any>;
  public totalReceiveOrders: number;
  public totalReceiveOrdersPages: number;
  public currentPageReceiveOrders: number = 1;
  public fulfillOrders: Array<any>;
  public totalFulfillOrders: number;
  public totalFulfillOrdersPages: number;
  public currentPageFulfillOrders: number = 1;
  public orderName: string;
  public stores: Array<any> = [];
  public warehouses: Array<any> = [];
  public suppliers: Array<any> = [];
  public ordersLimitPerPage: number = 10;
  public selectedStoreId: string = "";
  public selectedWarehouseId: string = "Select...";
  public selectedSupplierId: string = "";
  public searchCategoryText: string;
  public typeaheadLoading: boolean;
  public typeaheadNoResults: boolean;
  public categoriesList: Observable<any>;
  public categoriesListLimit: number = 7;
  public selectedCategoryId: string;
  public maxPageDisplay: number = 7;
  public uploader: FileUploader;
  public createSales: boolean = true;

  constructor(private orgModelApi: OrgModelApi,
              private _route: ActivatedRoute,
              private _router: Router,
              private toastr: ToastrService,
              private _userProfileService: UserProfileService,
              private auth: LoopBackAuth) {
  }

  ngOnInit() {
    this.userProfile = this._userProfileService.getProfileData();
    this._route.data.subscribe((data: any) => {
        this.populateOrders(data.stockOrders);

        for (var i = 0; i < this.userProfile.storeModels.length; i++) {
          if (this.userProfile.storeModels.isWarehouse) {
            this.warehouses.push(this.userProfile.storeModels[i]);
          }
          else {
            this.stores.push(this.userProfile.storeModels[i])
          }
        }
        this.suppliers = data.stockOrders.suppliers;
      },
      error => {
        console.log('error', error)
      });

    let orderUploadUrl: string = LoopBackConfig.getPath() + "/" + LoopBackConfig.getApiVersion() +
      "/OrgModels/" + this.userProfile.orgModelId + "/importVendOrderFromFile";
    this.uploader = new FileUploader({
      url: orderUploadUrl,
      autoUpload: false,
      authToken: this.auth.getAccessTokenId(),
      removeAfterUpload: true
    });

    this.categoriesList = Observable.create((observer: any) => {
      // Runs on every search
      observer.next(this.searchCategoryText);
    })
      .pipe(mergeMap((token: string) => this.searchCategory(token)));
  }

  fetchOrderRowCounts() {
    let orderIds = [];
    for (var i = 0; i < this.ordersLimitPerPage; i++) {
      if (this.generatedOrders[i])
        orderIds.push(this.generatedOrders[i].id);
      if (this.fulfillOrders[i])
        orderIds.push(this.fulfillOrders[i].id);
      if (this.receiveOrders[i])
        orderIds.push(this.receiveOrders[i].id);
    }
    this.orgModelApi.fetchOrderRowCounts(this.userProfile.orgModelId, orderIds)
      .subscribe((rowCounts: any) => {
          for (var i = 0; i < this.ordersLimitPerPage; i++) {
            if (this.generatedOrders[i]) {
              let orderRowCount = rowCounts.find(eachRowCount => {
                return eachRowCount.reportModelId === this.generatedOrders[i].id;
              });
              this.generatedOrders[i].totalRows = orderRowCount ? orderRowCount.totalRows : 0;
            }
            if (this.fulfillOrders[i]) {
              let orderRowCount = rowCounts.find(eachRowCount => {
                return eachRowCount.reportModelId === this.fulfillOrders[i].id;
              });
              this.fulfillOrders[i].totalRows = orderRowCount ? orderRowCount.totalRows : 0;
            }
            if (this.receiveOrders[i]) {
              let orderRowCount = rowCounts.find(eachRowCount => {
                return eachRowCount.reportModelId === this.receiveOrders[i].id;
              });
              this.receiveOrders[i].totalRows = orderRowCount ? orderRowCount.totalRows : 0;
            }
          }
        },
        err => {
          console.log('err row counts', err);
        });
  }

  fetchOrders(limit?: number, skip?: number, searchText?: string){
    this.loading = true;
    limit = limit || 10;
    skip = skip || 0;
    let filter = {
      limit: limit,
      skip: skip,
      order: 'createdAt DESC',
      include: ['storeModel', 'userModel', 'supplierModel'],
    };

    let generatedReportsCountFilter = {
      storeModelId: {
        inq: this.userProfile.storeModels.map(x => x.objectId)
      },
      state: {
        inq: [constants.REPORT_STATES.EXECUTING, constants.REPORT_STATES.GENERATED, constants.REPORT_STATES.PUSHING_TO_VEND]
      }
    };

    let generatedReportsFilter = {
      ...filter, ...{
        where: generatedReportsCountFilter
      }
    };

    let receiveReportsCountFilter = {
      storeModelId: {
        inq: this.userProfile.storeModels.map(x => x.objectId)
      },
      state: {
        inq: [constants.REPORT_STATES.RECEIVE]
      }
    };
    let receiveReportsFilter = {
      ...filter, ...{
        where: receiveReportsCountFilter
      }
    };

    let fulfillReportsCountFilter = {
      or: [
        {
          supplierModelId: {
            neq: null
          }
        },
        {
          deliverFromStoreModelId: {
            inq: this.userProfile.storeModels.map(x => x.objectId)
          }
        }
      ],
      state: {
        inq: [constants.REPORT_STATES.FULFILL]
      }
    };
    let fulfillReportsFilter = {
      ...filter, ...{
        where: fulfillReportsCountFilter
      }
    };

    let fetchOrders = combineLatest(
      this.orgModelApi.getReportModels(this.userProfile.orgModelId, generatedReportsFilter),
      this.orgModelApi.countReportModels(this.userProfile.orgModelId, generatedReportsCountFilter),
      this.orgModelApi.getReportModels(this.userProfile.orgModelId, receiveReportsFilter),
      this.orgModelApi.countReportModels(this.userProfile.orgModelId, receiveReportsCountFilter),
      this.orgModelApi.getReportModels(this.userProfile.orgModelId, fulfillReportsFilter),
      this.orgModelApi.countReportModels(this.userProfile.orgModelId, fulfillReportsCountFilter),
      this.orgModelApi.getSupplierModels(this.userProfile.orgModelId)
    );
    fetchOrders.subscribe((data: any) => {
      this.loading = false;
        let stockOrders = {
          generatedOrders: data[0],
          generatedOrdersCount: data[1].count,
          receiveOrders: data[2],
          receiveOrdersCount: data[3].count,
          fulfillOrders: data[4],
          fulfillOrdersCount: data[5].count,
          suppliers: data[6]
        };
        this.populateOrders(stockOrders);
      },
      err => {
        this.loading = false;
        this.toastr.error('Some error occurred');
        console.log('Could not fetch stock orders', err);
        return err;
      });

  };

  populateOrders(stockOrders) {
    this.generatedOrders = stockOrders.generatedOrders;
    this.totalGeneratedOrders = stockOrders.generatedOrdersCount;
    this.totalGeneratedOrdersPages = this.totalGeneratedOrders / this.ordersLimitPerPage;

    this.fulfillOrders = stockOrders.fulfillOrders;
    this.totalFulfillOrders = stockOrders.fulfillOrdersCount;
    this.totalFulfillOrdersPages = this.totalFulfillOrders / this.ordersLimitPerPage;

    this.receiveOrders = stockOrders.receiveOrders;
    this.totalReceiveOrders = stockOrders.receiveOrdersCount;
    this.totalReceiveOrdersPages = this.totalReceiveOrders / this.ordersLimitPerPage;

    this.fetchOrderRowCounts();
  }


  goToStockOrderDetailsPage(id, orderState) {
    this.loading = true;
    this._router.navigate(['orders/stock-orders/' + orderState + '/' + id]);
  }

  generateStockOrder() {
    let EventSource = window['EventSource'];
    let url = '/api/OrgModels/' + this.userProfile.orgModelId + '/generateStockOrderMSD?access_token=' + this.auth.getAccessTokenId() + '&type=json';
    if (this.selectedStoreId)
      url += '&storeModelId=' + this.selectedStoreId;
    if (this.selectedWarehouseId)
      url += '&warehouseModelId=' + this.selectedWarehouseId;
    if (this.selectedCategoryId)
      url += '&categoryModelId=' + this.selectedCategoryId;
    let es = new EventSource(url);
    let toastr = this.toastr;
    toastr.info('Generating stock order...');
    es.onmessage = function (event) {
      let response = JSON.parse(event.data);
      if (response.success) {
        toastr.success('Order generated');

      }
      else {
        toastr.error('Error in generating order');
      }
      es.close();
    };
    es.onerror = function (event) {
      toastr.error('Error in generating order');
    }
  };

  generateStockOrderVend() {
    if (!this.selectedStoreId) {
      this.toastr.error('Select a store to deliver to');
      return;
    }
    if (this.uploader.queue.length) {
      console.log('uploading file...', this.uploader);
      this.uploader.onBuildItemForm = (fileItem: any, form: any)=> {
        form.append('storeModelId', this.selectedStoreId);
      };
      this.uploader.uploadAll();
      this.uploader.onSuccessItem = (item: any, response: any, status: number, headers: any): any => {
        this.loading = false;
        this.toastr.info('Importing stock order from file...');
      };
      this.uploader.onErrorItem = (item: any, response: any, status: number, headers: any): any => {
        this.loading = false;
        console.log('Error uploading file');
        console.log('response', response);
        console.log('status', status);
        this.toastr.error('Error importing stock order from file');
      };
    }
    else if (this.selectedSupplierId) {
      let url = '/api/OrgModels/' + this.userProfile.orgModelId + '/generateStockOrderVend?access_token=' + this.auth.getAccessTokenId() + '&type=json';
      url += '&supplierModelId=' + this.selectedSupplierId;
      url += '&storeModelId=' + this.selectedStoreId;
      url += '&name=' + this.orderName;
      let EventSource = window['EventSource'];
      let es = new EventSource(url);
      let toastr = this.toastr;
      toastr.info('Generating stock order...');
      es.onmessage = function (event) {
        es.close();
        let response = JSON.parse(event.data);
        if (response.success) {
          toastr.success('Order generated');
        }
        else {
          toastr.error('Error in generating order');
        }
      };
      es.onerror = function (event) {
        toastr.error('Error in generating order');
      }
    }
    else {
      this.toastr.error('Select a supplier or upload a file to generate order from');
      return;
    }
  };

  searchCategory(searchToken) {
    return this.orgModelApi.getCategoryModels(this.userProfile.orgModelId, {
      where: {
        name: {
          regexp: '/.*' + searchToken + '.*/i'
        }
      },
      limit: this.categoriesListLimit,
      fields: ['name', 'id']
    })
      .pipe(map((data: any) => {
          return data;
        },
        err => {
          console.log('err', err);
        }));
  }

  public typeaheadOnSelect(e: TypeaheadMatch): void {
    this.selectedCategoryId = e.item.id;
  }

}
