import {Component, OnInit} from '@angular/core';
import {OrgModelApi} from "../../../shared/lb-sdk/services/custom/OrgModel";
import {ActivatedRoute, Router} from '@angular/router';
import {Observable} from 'rxjs';
import {ToastrService} from 'ngx-toastr';
import {UserProfileService} from "../../../shared/services/user-profile.service";
import {LoopBackAuth} from "../../../shared/lb-sdk/services/core/auth.service";
import {TypeaheadMatch} from 'ngx-bootstrap';

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
  public totalOrders: number;
  public totalPages: number;
  public currentPage: number = 1;
  public ordersLimitPerPage: number = 10;
  public selectedStoreId: string = "Select...";
  public selectedWarehouseId: string = "Select...";
  public searchCategoryText: string;
  public typeaheadLoading: boolean;
  public typeaheadNoResults: boolean;
  public categoriesList: Observable<any>;
  public categoriesListLimit: number = 7;
  public selectedCategoryId: string;

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
        for (var i = 0; i < data.stockOrders.stores.length; i++) {
          if (data.stockOrders.stores[i].isWarehouse) {
            this.warehouses.push(data.stockOrders.stores[i]);
          }
          else {
            this.stores.push(data.stockOrders.stores[i])
          }
        }
        this.totalOrders = data.stockOrders.count;
        this.totalPages = this.totalOrders / this.ordersLimitPerPage;
      },
      error => {
        console.log('error', error)
      });

    this.categoriesList = Observable.create((observer: any) => {
      // Runs on every search
      observer.next(this.searchCategoryText);
    })
      .mergeMap((token: string) => this.searchCategory(token));
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
      order: 'created DESC',
      include: 'storeModel',
      where: {
        transferOrderNumber: {
          exists: false
        }
      }
    };
    let fetchOrders = Observable.combineLatest(
      this.orgModelApi.getReportModels(this.userProfile.orgModelId, filter),
      this.orgModelApi.countReportModels(this.userProfile.orgModelId));
    fetchOrders.subscribe((data: any) => {
        this.loading = false;
        this.orders = data[0];
        this.totalOrders = data[1].count;

        this.totalPages = Math.floor(this.totalOrders / 100);
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
      .map((data: any) => {
          return data;
        },
        err => {
          console.log('err', err);
        });
  }

  public typeaheadOnSelect(e: TypeaheadMatch): void {
    this.selectedCategoryId = e.item.id;
  }

}
