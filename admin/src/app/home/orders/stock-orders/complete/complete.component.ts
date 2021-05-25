import {Component, OnInit} from '@angular/core';
import {OrgModelApi} from "../../../../shared/lb-sdk/services/custom/OrgModel";
import {ActivatedRoute, Router} from '@angular/router';
import {Observable, combineLatest} from 'rxjs';
import {ToastrService} from 'ngx-toastr';
import {UserProfileService} from "../../../../shared/services/user-profile.service";
import {LoopBackAuth} from "../../../../shared/lb-sdk/services/core/auth.service";
import {constants} from "../../../../shared/constants/constants";
import {DatePipe} from '@angular/common';
import Utils from '../../../../shared/constants/utils';

@Component({
  selector: 'app-complete',
  templateUrl: 'complete.component.html',
  styleUrls: ['complete.component.scss']
})
export class CompleteComponent implements OnInit {


  public userProfile: any;
  public order: any;
  public loading: boolean;
  public currentPage: number;
  public lineItemsLimitPerPage: number = 100;
  public lineItems: Array<any>;
  public totalLineItems: number;
  public sortAscending = true;
  public sortColumn = 'productModelSku';
  public searchSKUText = '';
  public searchEntry = '';
  public selectedFilter = 'All';
  public availableFilters = {
    ALL: 'All',
    BACK_ORDERED: 'Back Ordered',
    OVER_DELIVERED: 'Over Delivered',
    UNDER_DELIVERED: 'Under Delivered',
    DAMAGED: 'Damaged',
  };
  public getDiscrepancyReason = Utils.getDiscrepancyReason;
  selectedCategoryLabelFilter: any;

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
        this.getStockOrderLineItems();
      },
      error => {
        console.log('error', error)
      });
  }

  getStockOrderLineItems(limit?: number, skip?: number, productModelIds?: Array<string>) {
    if (!(limit && skip)) {
      limit = this.lineItemsLimitPerPage || 100;
      skip = 0;
    }
    if ((productModelIds !== undefined && productModelIds !== null) && (!productModelIds && !productModelIds.length)) {
      this.searchSKUText = '';
    }
    let sortOrder = this.sortAscending ? 'ASC' : 'DESC';
    let whereFilter = {
        reportModelId: this.order.id,
      };
      if(productModelIds && productModelIds.length) {
        // Remove filter in case of search
        this.selectedCategoryLabelFilter = undefined;
        whereFilter['productModelId'] = {
          inq : productModelIds
        };
      } else if (this.selectedCategoryLabelFilter) {
        whereFilter['categoryModelName'] = this.selectedCategoryLabelFilter;
      }
    let filter = {
      where: whereFilter,
      include: [
        {
          relation: 'productModel'
        },
        {
          relation: 'commentModels',
          scope: {
            include: 'userModel'
          }
        }
      ],
      limit: limit,
      skip: skip,
      order: 'categoryModelName ' + sortOrder + ', ' + this.sortColumn + ' ' + sortOrder
    };
    let countFilter = {
      reportModelId: this.order.id
    };
    if (productModelIds && productModelIds.length) {
      countFilter['productModelId'] = {inq: productModelIds};
    } else if (this.selectedCategoryLabelFilter) {
      countFilter['categoryModelName'] = this.selectedCategoryLabelFilter
    }
    this.loading = true;
    let fetchLineItems = combineLatest(
      this.orgModelApi.getStockOrderLineitemModels(this.userProfile.orgModelId, filter),
      this.orgModelApi.countStockOrderLineitemModels(this.userProfile.orgModelId, countFilter));
    fetchLineItems.subscribe((data: any) => {
        this.loading = false;
        this.currentPage = (skip / this.lineItemsLimitPerPage) + 1;
        this.totalLineItems = data[1].count;
        this.lineItems = data[0];
        this.lineItems.forEach(x => {
          x.isCollapsed = true;
          x.reason = Utils.getDiscrepancyReason(x);
        });
      },
      err => {
        this.loading = false;
        console.log('error', err);

        // Clear selected filter if api call fails
        if (this.selectedCategoryLabelFilter) {
          this.selectedCategoryLabelFilter = undefined;
        }
      });
  }

  searchProductBySku(sku?: string) {
    this.loading = true;
    this.selectedCategoryLabelFilter = undefined;
    var pattern = new RegExp('.*'+sku+'.*', "i"); /* case-insensitive RegExp search */
    var filterData = pattern.toString();
    this.orgModelApi.getProductModels(this.userProfile.orgModelId, {
      where: {
        sku: { "regexp": filterData }
      }
    }).subscribe((data: any) => {
      if (data.length) {
        var productModelIds = data.map(function filterProductIds(eachProduct) {
          return eachProduct.id;
        });
        this.getStockOrderLineItems(100, 0, productModelIds);
      }
      else {
        this.loading = false;
        this.lineItems = [];
        this.totalLineItems = 0;
        this.currentPage = 1;
      }
    })
  }



  getDiscrepancyOrStockOrderLineItems(limit?: number, skip?: number) {
    if (!(limit && skip)) {
      limit = this.lineItemsLimitPerPage || 100;
      skip = 0;
    }
    let sortOrder = this.sortAscending ? 1 : 0;
    let filter: any = {
      limit: limit,
      skip: skip,
      order: {
        'categoryModelName': sortOrder,
        [this.sortColumn]: sortOrder
      },
      backorderedOnly: false
    };
    switch (this.selectedFilter) {
      case this.availableFilters.ALL:
        this.getStockOrderLineItems();
        return;
      case this.availableFilters.BACK_ORDERED:
        filter.backorderedOnly = true;
        break;
      case this.availableFilters.OVER_DELIVERED:
        filter.backorderedOnly = false;
        filter.overDelivered = true;
        break;
      case this.availableFilters.UNDER_DELIVERED:
        filter.backorderedOnly = false;
        filter.underDelivered = true;
        break;
      case this.availableFilters.DAMAGED:
        filter.backorderedOnly = false;
        filter.damagedOnly = true;
        break;
    }
    this.loading = true;
    this.orgModelApi.getDiscrepancyOrBackOrderedLineItems(this.userProfile.orgModelId, this.order.id , filter)
      .subscribe((data: any) => {
        this.loading = false;
        this.currentPage = (skip / this.lineItemsLimitPerPage) + 1;
        this.totalLineItems = data.count;
        for (var i = 0; i < data.data.length; i++) {
          data.data[i].isCollapsed = true;
        }
        this.lineItems = data.data;
      },
      err => {
        this.loading = false;
        console.log('error', err);
      });

  }

  downloadOrderCSV() {
    this.loading = true;
    this.orgModelApi.downloadReportModelCSV(this.userProfile.orgModelId, this.order.id).subscribe((data) => {
      const link = document.createElement('a');
      link.href = data;
      link.download = this.order.name;
      link.click();
      this.loading = false;
    }, err=> {
      this.loading = false;
      console.log(err);
    })
  }

  collapsed(event: any): void {
    // console.log(event);
  }

  expanded(event: any): void {
    // console.log(event);
  }

   keyUpEvent(event, searchSKUText) {
    if(event.keyCode == '13') {
      this.searchProductBySku(searchSKUText)
    }
  }

  getFilterOptions() {
    return Object.values(this.availableFilters);
  }

  changeFilter(filter: string) {
    this.selectedFilter = filter;
    this.getDiscrepancyOrStockOrderLineItems();
  }

  refreshLineItems() {
    this.getStockOrderLineItems()
  }
}
