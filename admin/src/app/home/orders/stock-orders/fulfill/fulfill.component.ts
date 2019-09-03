import {Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import {OrgModelApi} from "../../../../shared/lb-sdk/services/custom/OrgModel";
import {ActivatedRoute, Router} from '@angular/router';
import {Observable, combineLatest} from 'rxjs';
import {ToastrService} from 'ngx-toastr';
import {UserProfileService} from "../../../../shared/services/user-profile.service";
import {LoopBackAuth} from "../../../../shared/lb-sdk/services/core/auth.service";
import {constants} from "../../../../shared/constants/constants";
import {ModalDirective} from 'ngx-bootstrap/modal';
import {BsModalRef, BsModalService} from "ngx-bootstrap/modal";
import {DeleteOrderComponent} from "../modals/delete-order/delete-order.component";

@Component({
  selector: 'app-fulfill',
  templateUrl: './fulfill.component.html',
  styleUrls: ['./fulfill.component.scss']
})
export class FulfillComponent implements OnInit {
  @ViewChild('discrepancyModal') public discrepancyModal: ModalDirective;
  @ViewChild('searchInput') public searchInputRef: ElementRef;

  public userProfile: any;
  public loading = false;
  public filter: any = {};
  public order: any = {};
  public fulfilledLineItems: Array<any>;
  public notFulfilledLineItems: Array<any>;
  public totalFulfilledLineItems: number;
  public totalNotFulfilledLineItems: number;
  public maxPageDisplay: number = 7;
  public searchSKUText: string;
  public totalPages: number;
  public currentPageFulfilled: number = 1;
  public currentPageNotFulfilled: number = 1;
  public lineItemsLimitPerPage: number = 100;
  public creatingTransferOrder: boolean = false;
  public creatingPurchaseOrderVend: boolean = false;
  public reportStates: any = constants.REPORT_STATES;
  public isWarehouser: boolean = false;
  public editable: boolean;
  public searchSKUFocused: boolean = true;
  public enableBarcode: boolean = true;
  public discrepancyOrderItem: any;
  public sortAscending = true;
  public sortColumn = 'productModelSku';
  showAddProductModal: boolean;
  public bsModalRef: BsModalRef;

  constructor(private orgModelApi: OrgModelApi,
              private _route: ActivatedRoute,
              private _router: Router,
              private toastr: ToastrService,
              private _userProfileService: UserProfileService,
              private auth: LoopBackAuth,
              private modalService: BsModalService) {
  }

  ngOnInit() {
    this.userProfile = this._userProfileService.getProfileData();


    this._route.data.subscribe((data: any) => {
        this.order = data.stockOrderDetails[0];
        this.getNotFulfilledStockOrderLineItems();
        this.getFulfilledStockOrderLineItems();
      },
      error => {
        console.log('error', error)
      });

    if (this.order.state === constants.REPORT_STATES.FULFILMENT_PENDING ||
      this.order.state === constants.REPORT_STATES.FULFILMENT_IN_PROCESS ||
      this.order.state === constants.REPORT_STATES.FULFILMENT_FAILURE) {
      this.editable = true;
    }

    //update order to state "Approval in Process" from "Generated"
    if (this.order.state === constants.REPORT_STATES.FULFILMENT_PENDING) {
      this.orgModelApi.updateByIdReportModels(this.userProfile.orgModelId, this.order.id, {
        state: constants.REPORT_STATES.FULFILMENT_IN_PROCESS
      })
        .subscribe((data: any) => {
          console.log('updated report state to fulfilment in process', data);
        });
    }
  }


  getFulfilledStockOrderLineItems(limit?: number, skip?: number, productModelId?: string) {
    if (!(limit && skip)) {
      limit = 100;
      skip = 0;
    }
    if (!productModelId) {
      this.searchSKUText = ''
    }
    let sortOrder = this.sortAscending ? 'ASC' : 'DESC';
    const filter: any = {
      where: {
        reportModelId: this.order.id,
        approved: true,
        fulfilledQuantity: {
          gt: 0
        },
        productModelId: productModelId
      },
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
      order: 'binLocation ' + sortOrder + ', ' + this.sortColumn + ' ' + sortOrder
    };
    let countFilter: any = {
      reportModelId: this.order.id,
      approved: true,
      fulfilledQuantity: {
        gt: 0
      }
    };
    if (productModelId)
      countFilter['productModelId'] = productModelId;
    this.loading = true;
    let fetchLineItems = combineLatest(
      this.orgModelApi.getStockOrderLineitemModels(this.userProfile.orgModelId, filter),
      this.orgModelApi.countStockOrderLineitemModels(this.userProfile.orgModelId, countFilter));
    fetchLineItems.subscribe((data: any) => {
        this.loading = false;
        this.currentPageFulfilled = (skip / this.lineItemsLimitPerPage) + 1;
        this.totalFulfilledLineItems = data[1].count;
        this.fulfilledLineItems = data[0];
        this.fulfilledLineItems.forEach(x => {
          x.isCollapsed = true;
        });
      },
      err => {
        this.loading = false;
        console.log('error', err);
      });
  }

  getNotFulfilledStockOrderLineItems(limit?: number, skip?: number, productModelId?: string) {
    if (!(limit && skip)) {
      limit = 100;
      skip = 0;
    }
    if (!productModelId) {
      this.searchSKUText = ''
    }
    let sortOrder = this.sortAscending ? 'ASC' : 'DESC';
    let filter = {
      where: {
        reportModelId: this.order.id,
        approved: true,
        fulfilled: false,
        productModelId: productModelId
      },
      include: [
        {
          relation: 'productModel',
        }, {
          relation: 'commentModels',
          scope: {
            include: 'userModel'
          }
        }
      ],
      limit: limit,
      skip: skip,
      order: 'binLocation ' + sortOrder + ', ' + this.sortColumn + ' ' + sortOrder
    };
    let countFilter = {
      reportModelId: this.order.id,
      boxNumber: {
        eq: null
      },
      approved: true,
      fulfilled: false
    };
    if (productModelId)
      countFilter['productModelId'] = productModelId;
    this.loading = true;
    let fetchLineItems = combineLatest(
      this.orgModelApi.getStockOrderLineitemModels(this.userProfile.orgModelId, filter),
      this.orgModelApi.countStockOrderLineitemModels(this.userProfile.orgModelId, countFilter));
    fetchLineItems.subscribe((data: any) => {
        this.loading = false;
        this.currentPageNotFulfilled = (skip / this.lineItemsLimitPerPage) + 1;
        this.totalNotFulfilledLineItems = data[1].count;
        for (var i = 0; i < data[0].length; i++) {
          // If Manual Mode And The fulfilledQuantity is default 0 then prefill with full order Quantity
          if (!this.enableBarcode && data[0][i].fulfilledQuantity === 0) {
            data[0][i].fulfilledQuantity = data[0][i].orderQuantity;
          }
          data[0][i].isCollapsed = true;
        }
        this.notFulfilledLineItems = data[0];
      },
      err => {
        this.loading = false;
        console.log('error', err);
      });
  }

  searchAndIncrementProduct(sku?: string, force: boolean = false) {
    this.discrepancyModal.hide();
    this.loading = true;
    this.orgModelApi.scanBarcodeStockOrder(this.userProfile.orgModelId,
      'fulfill',
      sku,
      this.order.id,
      force)
      .subscribe(searchedOrderItem => {
        if (searchedOrderItem.showDiscrepancyAlert) {
          this.discrepancyOrderItem = searchedOrderItem;
          this.discrepancyModal.show();
        } else {
          this.toastr.success('Row updated');
        }
        this.searchInputRef.nativeElement.focus();
        this.searchInputRef.nativeElement.select();
        this.fulfilledLineItems = [searchedOrderItem];
        this.totalFulfilledLineItems = this.fulfilledLineItems.length;
        if (!searchedOrderItem.fulfilled) {
          this.notFulfilledLineItems = [searchedOrderItem];
        } else {
          this.notFulfilledLineItems = [];
        }
        this.totalNotFulfilledLineItems = this.notFulfilledLineItems.length;
        this.loading = false;
      }, error => {
        this.loading = false;
        this.toastr.error(error.message);
        this.notFulfilledLineItems = [];
        this.fulfilledLineItems = [];
        this.totalFulfilledLineItems = 0;
        this.totalNotFulfilledLineItems = 0;
      });
  }

  searchProductBySku(sku?: string) {
    this.loading = true;
    this.orgModelApi.getProductModels(this.userProfile.orgModelId, {
      where: {
        sku: sku
      }
    }).subscribe((data: any) => {
      if (data.length) {
        this.getFulfilledStockOrderLineItems(1, 0, data[0].id);
        this.getNotFulfilledStockOrderLineItems(1, 0, data[0].id);
      }
      else {
        this.loading = false;
        this.currentPageNotFulfilled = 1;
        this.totalNotFulfilledLineItems = 0;
        this.notFulfilledLineItems = [];
        this.fulfilledLineItems = [];
        this.totalFulfilledLineItems = 0;
        this.currentPageFulfilled = 1;
      }
    })
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
          this.getFulfilledStockOrderLineItems();
          this.getNotFulfilledStockOrderLineItems();
          console.log('approved', res);
          this.toastr.success('Row Updated');
        },
        err => {
          this.toastr.error('Error Updating Row');
          console.log('err', err);
          this.loading = false;
        });
  }

  fulfillItem(lineItem) {
    this.updateLineItems(lineItem, {
      fulfilledQuantity: lineItem.fulfilledQuantity,
      fulfilled: true
    });
  }

  removeItem(lineItem) {
    this.updateLineItems(lineItem, {fulfilled: false, fulfilledQuantity: 0});
  }

  getOrderDetails() {
    let previousState = this.order.state;
    this.loading = true;
    this.orgModelApi.getReportModels(this.userProfile.orgModelId, {
      where: {
        id: this.order.id
      },
      include: 'storeModel'
    })
      .subscribe((data: any) => {
          this.order = data[0];
          //fetch line items only if the report status changes from executing to generated
          this.getNotFulfilledStockOrderLineItems();
          this.getFulfilledStockOrderLineItems();
          this.loading = false;
        },
        err => {
          this.loading = false;
          this.toastr.error('Error updating order state, please refresh');
        });
  };

  sendDelivery() {
    this.loading = true;
    this.orgModelApi.sendConsignmentDelivery(this.userProfile.orgModelId, this.order.id)
      .subscribe((data: any) => {
        this.toastr.success('Sent consignment successfully');
        this._router.navigate(['/orders/stock-orders']);
      }, err => {
        this.toastr.error('Error sending consignment');
        this.loading = false;
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

  /**
   * @description If the scan mode is changed
   * to barcode scanning, then focus is set back to the sku
   * search bar
   */
  changeScanMode() {
    this.getNotFulfilledStockOrderLineItems();
    this.getFulfilledStockOrderLineItems();
    this.searchSKUText = '';
    if (this.enableBarcode) {
      this.searchSKUFocused = true;
    }
    else {
      this.searchSKUFocused = false;
    }
  }

  /**
   * @description Code to detect barcode scanner input and
   * calls the search sku function
   */
  barcodeSearchSKU($event: any) {
    if (this.enableBarcode && this.searchSKUText !== '') {
      this.searchAndIncrementProduct(this.searchSKUText);
      $event.target.select();
    }
  }

  collapsed(event: any): void {
    // console.log(event);
  }

  expanded(event: any): void {
    // console.log(event);
  }

  openDeleteModal() {
    this.bsModalRef = this.modalService.show(DeleteOrderComponent);
  }
}
