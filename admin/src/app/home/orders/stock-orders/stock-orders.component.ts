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

@Component({
  selector: 'app-stock-orders',
  templateUrl: './stock-orders.component.html',
  styleUrls: ['./stock-orders.component.scss']
})


export class StockOrdersComponent implements OnInit {

  public userProfile: any;
  public loading = false;
  public filter: any = {};
  public orders: Array<any>;
  public stores: Array<any> = [];
  public warehouses: Array<any> = [];
  public suppliers: Array<any> = [];
  public totalOrders: number;
  public totalPages: number;
  public currentPage: number = 1;
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
        this.orders = data.stockOrders.orders;
        this.fetchOrderRowCounts();
        for (var i = 0; i < data.stockOrders.stores.length; i++) {
          if (data.stockOrders.stores[i].isWarehouse) {
            this.warehouses.push(data.stockOrders.stores[i]);
          }
          else {
            this.stores.push(data.stockOrders.stores[i])
          }
        }
        this.totalOrders = data.stockOrders.count;
        this.suppliers = data.stockOrders.suppliers;
        this.totalPages = this.totalOrders / this.ordersLimitPerPage;
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
    for (var i = 0; i < this.orders.length; i++) {
      orderIds.push(this.orders[i].id);
    }
    this.orgModelApi.fetchOrderRowCounts(this.userProfile.orgModelId, orderIds)
      .subscribe((rowCounts: any) => {
          for (var i = 0; i < this.orders.length; i++) {
            let orderRowCount = rowCounts.find(eachRowCount => {
              return eachRowCount.reportModelId === this.orders[i].id;
            });
            this.orders[i].totalRows = orderRowCount ? orderRowCount.totalRows : 0;
          }
        },
        err => {
          console.log('err row counts', err);
        });
  }

  fetchOrders(limit?: number, skip?: number, searchText?: string) {
    if (!(limit && skip)) {
      limit = 10;
      skip = 0;
    }
    this.loading = true;
    let filter = {
      limit: limit,
      skip: skip,
      order: 'createdAt DESC',
      include: 'storeModel'
    };
    let fetchOrders = combineLatest(
      this.orgModelApi.getReportModels(this.userProfile.orgModelId, filter),
      this.orgModelApi.countReportModels(this.userProfile.orgModelId));
    fetchOrders.subscribe((data: any) => {
        this.loading = false;
        this.orders = data[0];
        this.totalOrders = data[1].count;
        this.currentPage = (skip / this.ordersLimitPerPage) + 1;
        this.totalPages = Math.floor(this.totalOrders / 100);
        this.fetchOrderRowCounts();
      },
      err => {
        this.loading = false;
        console.log('Couldn\'t load orders', err);
      });
  };

  goToStockOrderDetailsPage(id) {
    this.loading = true;
    this._router.navigate(['orders/stock-orders/' + id]);
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
      url += '&supplierModelId='+this.selectedSupplierId;
      url += '&storeModelId='+this.selectedStoreId;
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
