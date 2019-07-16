import {Component, OnDestroy, OnInit} from '@angular/core';
import {OrgModelApi} from "../../../shared/lb-sdk/services/custom/OrgModel";
import {ActivatedRoute, Router} from '@angular/router';
import {Observable, combineLatest, Subscription} from 'rxjs';
import {debounceTime, map, mergeMap} from 'rxjs/operators';
import {ToastrService} from 'ngx-toastr';
import {UserProfileService} from "../../../shared/services/user-profile.service";
import {TypeaheadMatch} from 'ngx-bootstrap';
import {FileUploader} from 'ng2-file-upload';
import {LoopBackConfig, LoopBackAuth} from "../../../shared/lb-sdk";
import {constants} from '../../../shared/constants/constants';
import {StockOrdersResolverService} from "./services/stock-orders-resolver.service";
import {EventSourceService} from '../../../shared/services/event-source.service';
import {HttpParams} from '@angular/common/http';

@Component({
  selector: 'app-stock-orders',
  templateUrl: './stock-orders.component.html',
  styleUrls: ['./stock-orders.component.scss']
})


export class StockOrdersComponent implements OnInit, OnDestroy {

  public userProfile: any;
  public loading = false;
  public filter: any = {};

  public generatedOrders: Array<any> = [];
  public pendingGeneratedOrdersCount: number;
  public totalGeneratedOrders: number;
  public totalGeneratedOrdersPages: number;
  public currentPageGeneratedOrders: number = 1;

  public receiveOrders: Array<any> = [];
  public pendingReceiveOrdersCount: number;
  public totalReceiveOrders: number;
  public totalReceiveOrdersPages: number;
  public currentPageReceiveOrders: number = 1;

  public fulfillOrders: Array<any> = [];
  public pendingFulfillOrdersCount: number;
  public totalFulfillOrders: number;
  public totalFulfillOrdersPages: number;
  public currentPageFulfillOrders: number = 1;

  public completedOrders: Array<any>;
  public totalCompletedOrders: number;
  public totalCompletedOrdersPages: number;
  public currentPageCompletedOrders: number = 1;

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
  public userStores;
  public orderConfigurations: any;
  public selectedOrderConfigurationId;
  private fetchStockOrdersDebounced: Observable<any>;
  private subscriptions: Subscription[] = [];

  constructor(private orgModelApi: OrgModelApi,
              private _route: ActivatedRoute,
              private _router: Router,
              private toastr: ToastrService,
              private _userProfileService: UserProfileService,
              private auth: LoopBackAuth,
              private _eventSourceService: EventSourceService,
              private _stockOrdersResolverService: StockOrdersResolverService) {
  }

  ngOnInit() {
    this.userProfile = this._userProfileService.getProfileData();
    this.userStores = this.userProfile.storeModels.map(x => x.objectId);
    this._route.data.subscribe((data: any) => {
        this.populateOrders(data.stockOrders);
        this.warehouses = data.stockOrders.warehouses;
        this.stores = this.userProfile.storeModels.filter(x => x.isWarehouse !== true);
        this.suppliers = data.stockOrders.suppliers;
        this.orderConfigurations = data.stockOrders.orderConfigurations;
        this.selectedOrderConfigurationId = this.orderConfigurations[0].id;
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
      if (this.generatedOrders && this.generatedOrders[i])
        orderIds.push(this.generatedOrders[i].id);
      if (this.fulfillOrders && this.fulfillOrders[i])
        orderIds.push(this.fulfillOrders[i].id);
      if (this.receiveOrders && this.receiveOrders[i])
        orderIds.push(this.receiveOrders[i].id);
      if (this.completedOrders && this.completedOrders[i])
        orderIds.push(this.completedOrders[i].id);
    }
    this.orgModelApi.fetchOrderRowCounts(this.userProfile.orgModelId, orderIds)
      .subscribe((rowCounts: any) => {
          for (var i = 0; i < this.ordersLimitPerPage; i++) {
            if (this.generatedOrders && this.generatedOrders[i]) {
              let orderRowCount = rowCounts.find(eachRowCount => {
                return eachRowCount.reportModelId === this.generatedOrders[i].id;
              });
              this.generatedOrders[i].totalRows = orderRowCount ? orderRowCount.totalRows : 0;
            }
            if (this.fulfillOrders && this.fulfillOrders[i]) {
              let orderRowCount = rowCounts.find(eachRowCount => {
                return eachRowCount.reportModelId === this.fulfillOrders[i].id;
              });
              this.fulfillOrders[i].totalRows = orderRowCount ? orderRowCount.approvedRows : 0;
            }
            if (this.receiveOrders && this.receiveOrders[i]) {
              let orderRowCount = rowCounts.find(eachRowCount => {
                return eachRowCount.reportModelId === this.receiveOrders[i].id;
              });
              this.receiveOrders[i].totalRows = orderRowCount ? orderRowCount.fulfilledRows : 0;
            }
            if (this.completedOrders && this.completedOrders[i]) {
              let orderRowCount = rowCounts.find(eachRowCount => {
                return eachRowCount.reportModelId === this.completedOrders[i].id;
              });
              this.completedOrders[i].totalRows = orderRowCount ? orderRowCount.receivedRows : 0;
            }
          }
        },
        err => {
          console.log('err row counts', err);
        });
  }

  fetchOrders = (orderType: string, limit?: number, skip?: number) => {
    this.loading = true;
    limit = limit || 10;
    skip = skip || 0;
    let fetchOrder;
    if (orderType === 'generated') {
      fetchOrder = this._stockOrdersResolverService.fetchGeneratedStockOrders;
    }
    else if (orderType === 'receive') {
      fetchOrder = this._stockOrdersResolverService.fetchReceiveStockOrders;
    }
    else if (orderType === 'fulfill') {
      fetchOrder = this._stockOrdersResolverService.fetchFulfillStockOrders;
    }
    else if (orderType === 'complete') {
      fetchOrder = this._stockOrdersResolverService.fetchCompletedStockOrders;
    }
    else if (orderType === 'all') {
      fetchOrder = this._stockOrdersResolverService.resolve;
    }

    fetchOrder(limit, skip)
      .subscribe((data: any) => {
          console.log('search', data);
          this.populateOrders(data);
          this.loading = false;
        },
        err => {
          this.loading = false;
          this.toastr.error('Some error occurred');
          console.log('Could not fetch stock orders', err);
        });
  };

  populateOrders(stockOrders) {

    if (stockOrders.generatedOrders) {
      this.generatedOrders = stockOrders.generatedOrders;
      this.pendingGeneratedOrdersCount = stockOrders.pendingGeneratedOrdersCount;
      this.totalGeneratedOrders = stockOrders.generatedOrdersCount;
      this.totalGeneratedOrdersPages = this.totalGeneratedOrders / this.ordersLimitPerPage;
      this.generatedOrders.forEach(order => {
        if (order.state === 'Processing') {
          this.waitForStockOrderNotification(order.id)
        }
      })
    }

    if (stockOrders.fulfillOrders) {
      this.fulfillOrders = stockOrders.fulfillOrders;
      this.pendingFulfillOrdersCount = stockOrders.pendingFulfillOrdersCount;
      this.totalFulfillOrders = stockOrders.fulfillOrdersCount;
      this.totalFulfillOrdersPages = this.totalFulfillOrders / this.ordersLimitPerPage;
    }

    if (stockOrders.receiveOrders) {
      this.receiveOrders = stockOrders.receiveOrders;
      this.pendingReceiveOrdersCount = stockOrders.pendingReceiveOrdersCount;
      this.totalReceiveOrders = stockOrders.receiveOrdersCount;
      this.totalReceiveOrdersPages = this.totalReceiveOrders / this.ordersLimitPerPage;
    }

    if (stockOrders.completedOrders) {
      this.completedOrders = stockOrders.completedOrders;
      this.totalCompletedOrders = stockOrders.totalCompletedOrders;
      this.totalCompletedOrdersPages = this.totalCompletedOrders / this.ordersLimitPerPage;
    }

    this.fetchOrderRowCounts();
  }


  goToStockOrderDetailsPage(id, orderState) {
    this.loading = true;
    this._router.navigate(['orders/stock-orders/' + orderState + '/' + id]);
  }

  generateStockOrderMSD() {
    this.loading = true;
    this.orgModelApi.generateStockOrderMSD(
        this.userProfile.orgModelId,
        this.selectedStoreId,
        this.selectedWarehouseId,
        this.selectedCategoryId
    ).subscribe(reportModelData => {
      this.loading = false;
      this.toastr.info('Generating stock order');
      console.log(reportModelData);
      this.generatedOrders.unshift({...reportModelData.data, backgroundEffect: true});
      this.waitForStockOrderNotification(reportModelData.callId)
    }, error => {
      this.loading = false;
      this.toastr.error('Error in generating order');
    });
  };

  generateStockOrderVend() {
    if (this.uploader.queue.length) {
      console.log('uploading file...', this.uploader);
      this.uploader.onBuildItemForm = (fileItem: any, form: any)=> {
        form.append('orderConfigModelId', this.selectedOrderConfigurationId);
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
    } else if (this.selectedSupplierId) {
        this.loading = true;

        this.orgModelApi.generateStockOrderVend(
            this.userProfile.orgModelId,
            this.selectedStoreId,
            this.selectedSupplierId,
            this.orderName || '',
            this.selectedWarehouseId
            ).subscribe(reportModelData => {
              this.loading = false;
              this.toastr.info('Generating stock order');
              console.log(reportModelData);
              this.generatedOrders.unshift({...reportModelData.data, backgroundEffect: true});
              this.waitForStockOrderNotification(reportModelData.callId)
        }, error => {
              this.loading = false;
              this.toastr.error('Error in generating order');
      })
    } else {
      this.toastr.error('Select a supplier or upload a file to generate order from');
      return;
    }
  };

  waitForStockOrderNotification(callId) {
    const EventSourceUrl = `/notification/${callId}/waitForResponseAPI`;
    this.subscriptions.push(
    this._eventSourceService.connectToStream(EventSourceUrl)
        .subscribe(([event, es]) => {
          console.log(event);
          es.close();
          this._stockOrdersResolverService.fetchGeneratedStockOrders(1, 0, event.data.reportModelId)
              .subscribe(reportModel => {
                const reportIndex = this.generatedOrders.findIndex((report) => report.id === event.data.reportModelId);
                this.generatedOrders[reportIndex] = reportModel.generatedOrders[0];
                this.totalGeneratedOrders = reportModel.generatedOrdersCount;
                this.totalGeneratedOrdersPages = this.totalGeneratedOrders / this.ordersLimitPerPage;
                if (event.data.success === true) {
                  this.toastr.success('Generated Stock Order Success');
                } else {
                  this.toastr.error('Error Generating Stock Order');
                }
                this.fetchOrderRowCounts();
              });

        })
    );
  }

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

  ngOnDestroy(): void {
    this.subscriptions.forEach(subscription => {
      if (subscription) {
        subscription.unsubscribe()
      }
    })
  }

}
