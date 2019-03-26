import {Component, OnInit} from '@angular/core';
import {OrgModelApi} from "../../../../shared/lb-sdk/services/custom/OrgModel";
import {ActivatedRoute, Router} from '@angular/router';
import {Observable} from 'rxjs';
import {ToastrService} from 'ngx-toastr';
import {UserProfileService} from "../../../../shared/services/user-profile.service";
import {LoopBackAuth} from "../../../../shared/lb-sdk/services/core/auth.service";
import {constants} from "../../../../shared/constants/constants";


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
  public searchSKUText: string;
  // public totalPages: number;
  public currentPageApproved: number = 1;
  public currentPageNotApproved: number = 1;
  public lineItemsLimitPerPage: number = 100;
  public creatingTransferOrder: boolean = false;
  public reportStates: any = constants.REPORT_STATES;

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
        this.order = data.stockOrderDetails[0];
        this.getNotApprovedStockOrderLineItems();
        this.getApprovedStockOrderLineItems();
      },
      error => {
        console.log('error', error)
      });
  }

  getApprovedStockOrderLineItems(limit?: number, skip?: number, productModelId?: string) {
    if (!(limit && skip)) {
      limit = 100;
      skip = 0;
    }
    let filter = {
      where: {
        reportModelId: this.order.id,
        approved: true,
        productModelId: productModelId
      },
      include: {
        relation: 'productModel'
      },
      limit: limit,
      skip: skip
    };
    let countFilter = {
      reportModelId: this.order.id,
      approved: true
    };
    if (productModelId)
      countFilter['productModelId'] = productModelId;
    this.loading = true;
    let fetchLineItems = Observable.combineLatest(
      this.orgModelApi.getStockOrderLineitemModels(this.userProfile.orgModelId, filter),
      this.orgModelApi.countStockOrderLineitemModels(this.userProfile.orgModelId, countFilter));
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

  getNotApprovedStockOrderLineItems(limit?: number, skip?: number, productModelId?: string) {
    if (!(limit && skip)) {
      limit = 100;
      skip = 0;
    }
    console.log('this', this.order);
    let filter = {
      where: {
        reportModelId: this.order.id,
        approved: false,
        productModelId: productModelId
      },
      include: {
        relation: 'productModel',
      },
      limit: limit,
      skip: skip
    };
    let countFilter = {
      reportModelId: this.order.id,
      approved: false
    };
    if (productModelId)
      countFilter['productModelId'] = productModelId;
    this.loading = true;
    let fetchLineItems = Observable.combineLatest(
      this.orgModelApi.getStockOrderLineitemModels(this.userProfile.orgModelId, filter),
      this.orgModelApi.countStockOrderLineitemModels(this.userProfile.orgModelId, countFilter));
    fetchLineItems.subscribe((data: any) => {
        this.loading = false;
        this.notApprovedLineItems = data[0];
        this.totalNotApprovedLineItems = data[1].count;
        console.log('not approved', this.totalNotApprovedLineItems);
      },
      err => {
        this.loading = false;
        console.log('error', err);
      });
  }

  searchProductBySku(sku?: string) {
    this.loading = true;
    this.orgModelApi.getProductModels(this.userProfile.orgModelId, {
      where: {
        api_id: sku
      }
    }).subscribe((data: any) => {
      this.getApprovedStockOrderLineItems(1, 0, data[0].id);
      this.getNotApprovedStockOrderLineItems(1, 0, data[0].id);
    })
  }

  createTransferOrder() {
    console.log('submitting');
    if (!this.totalApprovedLineItems) {
      this.toastr.error('Please approve at least one item to create Transfer Order in MSD');
    }
    else {
      this.creatingTransferOrder = true;
      let componentScope = this;
      let EventSource = window['EventSource'];
      let es = new EventSource('/api/OrgModels/' + this.userProfile.orgModelId + '/createTransferOrderMSD?access_token=' + this.auth.getAccessTokenId() + '&reportModelId=' + this.order.id + '&type=json');
      this.toastr.info('Generating transfer order...');
      this.getOrderDetails();
      let _router = this._router;
      es.onmessage = function (event) {
        let response = JSON.parse(event.data);
        console.log(response);
        if (response.success) {
          componentScope.toastr.success('Created transfer order in MSD');

        }
        else {
          componentScope.creatingTransferOrder = false;
          componentScope.toastr.error('Error in creating transfer order in MSD');
        }
        es.close();
      };
    }
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
        },
        err => {
          console.log('err', err);
          this.loading = false;
        });
  }

  getOrderDetails() {
    let previousState = this.order.state;
    this.loading = true;
    this.orgModelApi.getReportModels(this.userProfile.orgModelId, {
      where: {
        id: this.order.id
      }
    })
      .subscribe((data: any) => {
          this.order = data[0];
          //fetch line items only if the report status changes from executing to generated
          if (this.order.state === this.reportStates.GENERATED && previousState !== this.reportStates.GENERATED) {
            this.getNotApprovedStockOrderLineItems();
            this.getApprovedStockOrderLineItems();
          }
          this.loading = false;
        },
        err => {
          this.loading = false;
          this.toastr.error('Error updating order state, please refresh');
        });
  };

}
