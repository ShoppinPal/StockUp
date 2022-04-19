import {ChangeDetectorRef, Component, OnInit} from '@angular/core';
import {OrgModelApi} from '../../../shared/lb-sdk';
import {ActivatedRoute, Router} from '@angular/router';
import {ToastrService} from 'ngx-toastr';
import {UserProfileService} from '../../../shared/services/user-profile.service';
import {constants} from '../../../shared/constants/constants';
import {combineLatest} from 'rxjs/internal/observable/combineLatest';

@Component({
  selector: 'app-historical-orders',
  templateUrl: './historical-orders.component.html',
  styleUrls: ['./historical-orders.component.scss']
})
export class HistoricalOrdersComponent implements OnInit {
  loading = false;
  stores: Array<any> = [];
  suppliers: Array<any> = [];

  userProfile: any;
  orders: Array<any> = [];
  totalOrders: number;
  currentPage = 1;
  maxPageDisplay = 7;
  ordersPerPage = 50;

  // Filter Variables
  selectedStore: string;
  selectedSupplier: string;
  sortColumn = 'createdAt';
  sortAscending = false;
  dateStart: string;
  dateEnd: string;
  selectedDiscrepancyType ?: boolean = undefined;

  constructor(private orgModelApi: OrgModelApi,
              private _route: ActivatedRoute,
              private _router: Router,
              private toastr: ToastrService,
              private changeDetector: ChangeDetectorRef,
              private _userProfileService: UserProfileService
  ) {
  }


  ngOnInit() {
    this.userProfile = this._userProfileService.getProfileData();
    this.stores = [
      ...this.userProfile.storeModels,
      ...this.userProfile.discrepancyManagerStoreModels,
    ];
    this._route.data.subscribe((data: any) => {
        this.suppliers = data.data.suppliers;
      },
      error => {
        console.log('error', error)
      });
    this.getOrders();
  }

  getOrders(limit?: number, skip?: number) {
    if (!(limit && skip)) {
      limit = this.ordersPerPage || 10;
      skip = 0;
    }
    const sortOrder = this.sortAscending ? 'ASC' : 'DESC';

    let orderStoreIds = this.userProfile.storeModels.map(x => x.objectId);
    let discrepancyStoreIds = this.userProfile.discrepancyManagerStoreModels.map(x => x.objectId);
   const selectedStoreFilter = this.returnIfNotUndef(this.selectedStore);
    if (selectedStoreFilter) {
      orderStoreIds = orderStoreIds.filter(id => id === selectedStoreFilter);
      discrepancyStoreIds = discrepancyStoreIds.filter(id => id === selectedStoreFilter);
    }
    let dateEnd = new Date(this.dateEnd);
// If only one filled is set remove both
    if ((this.dateStart || this.dateEnd) && !(this.dateStart && this.dateEnd)) {
      this.dateEnd = undefined;
      this.dateStart = undefined;
      dateEnd = undefined;
    } else {
      dateEnd.setHours(23);
      dateEnd.setMinutes(59);
      dateEnd.setSeconds(59);
    }
    const filter = {
      limit: limit,
      skip: skip,
      order: `${this.sortColumn} ${sortOrder}`,
      where: {
        and: [
          {
            or: [
              // Order Managed Stores - Can view discrapencies & Completed
              {
                or: [
                  {
                    storeModelId: {
                      inq: orderStoreIds
                    }
                  },
                  {
                    deliverFromStoreModelId: {
                      inq: orderStoreIds
                    }
                  }
                ],
                discrepancies: this.returnIfNotUndef(this.selectedDiscrepancyType) ? { gt: 0 } : undefined
              },
              // Disprapancy Managed Stores - Can view discrapencies only
              {
                or: [
                  {
                    storeModelId: {
                      inq: discrepancyStoreIds
                    }
                  },
                  {
                    deliverFromStoreModelId: {
                      inq: discrepancyStoreIds
                    }
                  }
                ],
                discrepancies : { gt: 0 },
              }
            ],
          },
          // Common filter that apply to both
          {
            state: constants.REPORT_STATES.COMPLETE,
            supplierModelId: this.returnIfNotUndef(this.selectedSupplier),
          },
          {
            deletedAt: {
              exists: false
            }
          },
          {
            createdAt: this.dateStart && this.dateEnd ? {
              between: [new Date(this.dateStart), dateEnd]
            } : undefined,
          }
        ]
      },
      include: ['storeModel', 'supplierModel', 'userModel']
    };
    this.loading = true;
    combineLatest(
      this.orgModelApi.countReportModels(this.userProfile.orgModelId, filter.where),
      this.orgModelApi.getReportModels(this.userProfile.orgModelId, filter)
    )

      .subscribe(([{count}, data]) => {
        this.orders = data;
        this.totalOrders = count;
        this.loading = false;
        this.currentPage = (skip / this.ordersPerPage) + 1;
        this.fetchOrderRowCounts()
      }, error => {
        console.error(error);
        this.loading = false;
      });
  }

  returnIfNotUndef(value) {
    if (value === undefined || value === 'undefined') {
      return undefined;
    }
    return value;
  }

  resetFilters() {
    this.selectedSupplier = undefined;
    this.selectedStore = undefined;
    this.dateStart = undefined;
    this.dateEnd = undefined;
    this.selectedDiscrepancyType = undefined;
    this.getOrders()
  }

  goToStockOrderDetailsPage(id, complete: string) {
    this._router.navigate(['orders/stock-orders/complete/' + id]);

  }

  fetchOrderRowCounts() {
    const orderIds = [];
    for (let i = 0; i < this.orders.length; i++) {
      if (this.orders && this.orders[i]) {
        orderIds.push(this.orders[i].id);
      }
    }
    if (orderIds.length > 0) {
      this.orgModelApi.fetchOrderRowCounts(this.userProfile.orgModelId, orderIds)
        .subscribe((rowCounts: any) => {
            const countIdMap = {};
            rowCounts.forEach(function(data) {
              countIdMap[data.reportModelId] = data.totalRows || 0;
            });
            for (let i = 0; i < this.orders.length; i++) {
              if (this.orders && this.orders[i]) {
                this.orders[i].totalRows = countIdMap[this.orders[i].id] || 0;
              }
            }
            this.changeDetector.detectChanges();
          },
          err => {
            console.log('err row counts', err);
          });
    }
  }
}
