import {Component, OnInit} from '@angular/core';
import {OrgModelApi} from "../../../shared/lb-sdk/services/custom/OrgModel";
import {ActivatedRoute, Router} from '@angular/router';
import {Observable} from 'rxjs';
import {ToastrService} from 'ngx-toastr';
import {UserProfileService} from "../../../shared/services/user-profile.service";
import {LoopBackAuth} from "../../../shared/lb-sdk/services/core/auth.service";

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
  public stores: Array<any>;
  public totalOrders: number;
  public totalPages: number;
  public currentPage: number = 1;
  public ordersLimitPerPage: number = 10;
  // public searchCategoryText: string;
  // public searchCategoryFocused: boolean;
  // public foundCategory: boolean;
  // public searchedCategory: Array<any>;
  // public uploader: FileUploader;
  public selectedStoreId: string = "Select...";

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
        console.log(data);
        this.orders = data.stockOrders.orders;
        this.stores = data.stockOrders.stores;
        this.totalOrders = data.stockOrders.count;
        this.totalPages = this.totalOrders / this.ordersLimitPerPage;
      },
      error => {
        console.log('error', error)
      });
  }

  fetchOrders(limit?: number, skip?: number, searchText?: string) {
    if (!(limit && skip)) {
      limit = 10;
      skip = 0;
    }
    // this.searchCategoryFocused = true;
    // this.foundCategory = false;
    // this.searchedCategory = null;
    this.loading = true;
    let filter = {
      limit: limit,
      skip: skip,
      order: 'created DESC',
      include: 'storeModel'
    };
    // if (searchText) {
    //   filter.where = {
    //     name: {
    //       like: searchText
    //     }
    //   }
    // }
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
    let es = new EventSource('/api/OrgModels/' + this.userProfile.orgModelId + '/generateStockOrderMSD?access_token=' + this.auth.getAccessTokenId() + '&storeModelId=' + this.selectedStoreId + '&type=json');
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
  };
}