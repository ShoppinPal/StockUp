import {Component, OnDestroy, OnInit, ChangeDetectorRef} from '@angular/core';
import {OrgModelApi} from "../../../shared/lb-sdk/services/custom/OrgModel";
import {ActivatedRoute, Router} from '@angular/router';
import {Observable, Subscription} from 'rxjs';
import {ToastrService} from 'ngx-toastr';
import {UserProfileService} from "../../../shared/services/user-profile.service";
import {FileUploader} from 'ng2-file-upload';
import {LoopBackConfig, LoopBackAuth} from "../../../shared/lb-sdk";
import {constants} from '../../../shared/constants/constants';
import {StockOrdersResolverService} from "./services/stock-orders-resolver.service";
import {EventSourceService} from '../../../shared/services/event-source.service';

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

  public orderName: string;
  public stores: Array<any> = [];
  public suppliers: Array<any> = [];
  public ordersLimitPerPage: number = 100;
  public typeaheadLoading: boolean;
  public maxPageDisplay: number = 7;
  public uploader: FileUploader;
  public createSales: boolean = true;
  public userStores;
  public orgStores;
  public selectedDeliveredToStoreId: string = "";
  public selectedDeliveredFromStoreId: string = "";
  public filterOrder: boolean = false;
  public orderConfigurations: any;
  public selectedOrderConfigurationId;
  private subscriptions: Subscription[] = [];
  public REPORT_STATES = constants.REPORT_STATES;

  constructor(private orgModelApi: OrgModelApi,
              private _route: ActivatedRoute,
              private _router: Router,
              private toastr: ToastrService,
              private _userProfileService: UserProfileService,
              private changeDetector: ChangeDetectorRef,
              private auth: LoopBackAuth,
              private _eventSourceService: EventSourceService,
              private _stockOrdersResolverService: StockOrdersResolverService) {
  }

  ngOnInit() {
    this.loading = true;
    this.userProfile = this._userProfileService.getProfileData();
    this.userStores = this.userProfile.storeModels;
    this.orgStores = this.userProfile.storeModels;
    this._route.data.subscribe((data: any) => {
        this.populateOrders(data.stockOrders);
        this.stores = data.stockOrders.stores;
        this.orgStores = this.stores.filter(item => !item.ownerSupplierModelId);
        this.suppliers = data.stockOrders.suppliers;
        this.orderConfigurations = data.stockOrders.orderConfigurations;
        if (this.orderConfigurations && this.orderConfigurations.length > 0) {
          this.selectedOrderConfigurationId = this.orderConfigurations[0].id;
        }
        this.loading = false;
      },
      error => {
        this.loading = false;
          this.toastr.error('Some error occurred');
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
    }
    if(orderIds.length > 0) {
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
          }
          this.changeDetector.detectChanges();
        },
        err => {
          console.log('err row counts', err);
        });
    }
  }

  fetchOrders = (orderType: string, limit?: number, skip?: number, filterOrders?: false) => {
    let filterSelectedDeliveredToStoreId = '';
    let filterSelectedDeliveredFromStoreId = '';
    if (filterOrders) {
      filterSelectedDeliveredToStoreId = this.selectedDeliveredToStoreId;
      filterSelectedDeliveredFromStoreId = this.selectedDeliveredFromStoreId;
      this.filterOrder = filterOrders;
    } else {
      this.selectedDeliveredToStoreId = '';
      this.selectedDeliveredFromStoreId = '';
      this.filterOrder = filterOrders;
    }
    this.loading = true;
    limit = this.ordersLimitPerPage || limit || 10;
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
    else if (orderType === 'all') {
      fetchOrder = this._stockOrdersResolverService.resolve;
    }

    fetchOrder(filterSelectedDeliveredToStoreId, filterSelectedDeliveredFromStoreId, limit, skip)
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
        if (order.state === constants.REPORT_STATES.PROCESSING || order.state === constants.REPORT_STATES.SENDING_TO_SUPPLIER) {
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

    this.fetchOrderRowCounts();
  }


  goToStockOrderDetailsPage(id, orderState) {
    this.loading = true;
    this._router.navigate(['orders/stock-orders/' + orderState + '/' + id]);
  }




  waitForStockOrderNotification(callId) {
    const EventSourceUrl = `/notification/${callId}/waitForResponseAPI`;
    this.subscriptions.push(
      this._eventSourceService.connectToStream(EventSourceUrl)
        .subscribe(([event, es]) => {
          console.log(event);
          es.close();
          this.orgModelApi.getReportModels(this.userProfile.orgModelId, {
            where: {
              id: event.data.reportModelId
            },
            include: ['storeModel', 'userModel', 'supplierModel', 'deliverFromStoreModel'],
          })
              .subscribe(reportModels => {
                const reportModel = reportModels[0];
                const reportIndex = this.generatedOrders.findIndex((report) => report.id === event.data.reportModelId);
                this.generatedOrders[reportIndex] = reportModel;
                console.log(reportModel.state, constants.REPORT_STATES.FULFILMENT_PENDING, constants.REPORT_STATES.FULFILMENT_PENDING === reportModel.state);
                if (reportModel.state === constants.REPORT_STATES.GENERATED) {
                  this.toastr.success('Generated Stock Order Success', '', {
                    onActivateTick: true
                  });
                }
                else if (reportModel.state === constants.REPORT_STATES.FULFILMENT_PENDING) {
                  this.toastr.success('Order submitted for fulfilment successfully', '', {
                    onActivateTick: true
                  });
                }
                else if(reportModel.state === constants.REPORT_STATES.PROCESSING_FAILURE){
                  this.toastr.error('Error Generating Stock Order', '', {
                    onActivateTick: true
                  });
                }
                else if(reportModel.state === constants.REPORT_STATES.ERROR_SENDING_TO_SUPPLIER) {
                  this.toastr.error('Error in sending order for fulfilment', '', {
                    onActivateTick: true
                  });
                }
                this.fetchOrderRowCounts();
              });

        })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(subscription => {
      if (subscription) {
        subscription.unsubscribe()
      }
    })
  }

  private waitForFileImportWorker() {
    const EventSourceUrl = `/notification/${this.userProfile.userId}/waitForResponse`;
    this.subscriptions.push(
      this._eventSourceService.connectToStream(EventSourceUrl)
        .subscribe(([event, es]) => {
          console.log(event);
          es.close();
          if (event.data.success === true) {
            this.toastr.success('File Imported Successfully');
            this.fetchOrders('generated')
          } else {
            this.toastr.error('File Import Failed ');
          }
        })
    );
  }
}
