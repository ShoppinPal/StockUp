import {Component, OnInit} from '@angular/core';
import {OrgModelApi} from "../../../../shared/lb-sdk/services/custom/OrgModel";
import {ActivatedRoute} from '@angular/router';
import {Observable} from 'rxjs';
import {ToastrService} from 'ngx-toastr';
import {UserProfileService} from "../../../../shared/services/user-profile.service";
import {LoopBackAuth} from "../../../../shared/lb-sdk/services/core/auth.service";


@Component({
  selector: 'app-stock-order-details',
  templateUrl: './stock-order-details.component.html',
  styleUrls: ['./stock-order-details.component.scss']
})
export class StockOrderDetailsComponent implements OnInit {

  public userProfile: any;
  public loading = false;
  public filter: any = {};
  public order: any = {};
  public approvedLineItems: Array<any>;
  public notApprovedLineItems: Array<any>;
  public totalApprovedLineItems: number;
  public totalNotApprovedLineItems: number;
  // public totalPages: number;
  public currentPageApproved: number = 1;
  public currentPageNotApproved: number = 1;
  public lineItemsLimitPerPage: number = 10;

  constructor(private orgModelApi: OrgModelApi,
              private _route: ActivatedRoute,
              private toastr: ToastrService,
              private _userProfileService: UserProfileService,
              private auth: LoopBackAuth) {
  }

  ngOnInit() {
    this.userProfile = this._userProfileService.getProfileData();
    this._route.data.subscribe((data: any) => {
        this.order = data.stockOrderDetails[0];
        this.getApprovedStockOrderLineItems();
        this.getNotApprovedStockOrderLineItems();
      },
      error => {
        console.log('error', error)
      });
  }

  getApprovedStockOrderLineItems(limit?: number, skip?: number) {
    if (!(limit && skip)) {
      limit = 10;
      skip = 0;
    }
    let filter = {
      where: {
        reportModelId: this.order.id,
        approved: true
      },
      include: 'productModel',
      limit: limit,
      skip: skip
    };
    this.loading = true;
    let fetchLineItems = Observable.combineLatest(
      this.orgModelApi.getStockOrderLineitemModels(this.userProfile.orgModelId, filter),
      this.orgModelApi.countStockOrderLineitemModels(this.userProfile.orgModelId, {
        reportModelId: this.order.id,
        approved: true
      }));
    fetchLineItems.subscribe((data: any) => {
        this.loading = false;
        this.approvedLineItems = data[0];
        this.totalApprovedLineItems = data[1].count;
        console.log('approved', this.approvedLineItems);
      },
      err => {
        this.loading = false;
        console.log('error', err);
      });
  }

  getNotApprovedStockOrderLineItems(limit?: number, skip?: number) {
    if (!(limit && skip)) {
      limit = 10;
      skip = 0;
    }
    console.log('this', this.order);
    let filter = {
      where: {
        reportModelId: this.order.id,
        approved: false
      },
      include: 'productModel',
      limit: limit,
      skip: skip
    };
    this.loading = true;
    let fetchLineItems = Observable.combineLatest(
      this.orgModelApi.getStockOrderLineitemModels(this.userProfile.orgModelId, filter),
      this.orgModelApi.countStockOrderLineitemModels(this.userProfile.orgModelId, {
        reportModelId: this.order.id,
        approved: false
      }));
    fetchLineItems.subscribe((data: any) => {
        this.loading = false;
        this.notApprovedLineItems = data[0];
        this.totalNotApprovedLineItems = data[1].count;
        console.log('not approved', this.notApprovedLineItems);
      },
      err => {
        this.loading = false;
        console.log('error', err);
      });
  }

  createTransferOrder() {
    console.log('submitting');
    let EventSource = window['EventSource'];
    let es = new EventSource('/api/OrgModels/' + this.userProfile.orgModelId + '/createTransferOrderMSD?access_token=' + this.auth.getAccessTokenId() + '&reportModelId=' + this.order.id + '&type=json');
    let toastr = this.toastr;
    toastr.info('Generating transfer order...');
    es.onmessage = function (event) {
      es.close();
      let response = JSON.parse(event.data);
      if (response.success) {
        toastr.success('Created transfer order in MSD');
      }
      else {
        toastr.error('Error in creating transfer order in MSD');
      }
    };
  }

  updateLineItems(lineItems, data: any) {
    this.loading = true;
    let lineItemsIDs: Array<string> = [];
    if (lineItems instanceof Array) {
      for (var i = 0; i < lineItems.length; i++) {
        lineItemsIDs.push(lineItems[i].id);
      }
    }
    else {
      lineItemsIDs.push(lineItems.id)
    }
    this.orgModelApi.updateAllStockOrderLineItemModels(this.userProfile.orgModelId, this.order.id, lineItemsIDs, data)
      .subscribe((res: any) => {
          this.getApprovedStockOrderLineItems();
          this.getNotApprovedStockOrderLineItems();
          console.log('approved', res);
          this.loading = false;
        },
        err => {
          console.log('err', err);
          this.loading = false;
        });
  }

}