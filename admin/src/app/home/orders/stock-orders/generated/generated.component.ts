import {Component, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {OrgModelApi} from "../../../../shared/lb-sdk/services/custom/OrgModel";
import {ActivatedRoute, Router} from '@angular/router';
import {combineLatest, Subscription} from 'rxjs';
import {ToastrService} from 'ngx-toastr';
import {Color, BaseChartDirective, Label} from 'ng2-charts';
import {UserProfileService} from "../../../../shared/services/user-profile.service";
import {LoopBackAuth} from "../../../../shared/lb-sdk/services/core/auth.service";
import {constants} from "../../../../shared/constants/constants";
import {DatePipe} from '@angular/common';
import {EventSourceService} from '../../../../shared/services/event-source.service';
import {AddProductModalComponent} from '../../shared-components/add-product-modal/add-product-modal.component';
import Utils from '../../../../shared/constants/utils';
import {BsModalRef, BsModalService} from "ngx-bootstrap/modal";
import {DeleteOrderComponent} from "../../shared-components/delete-order/delete-order.component";
import {SharedDataService} from '../../../../shared/services/shared-data.service';

@Component({
  selector: 'app-generated',
  templateUrl: './generated.component.html',
  styleUrls: ['./generated.component.scss']
})
export class GeneratedComponent implements OnInit, OnDestroy {

  public userProfile: any;
  public loading = false;
  public filter: any = {};
  public order: any = {};
  public approvedLineItems: Array<any>;
  public notApprovedLineItems: Array<any>;
  public needsReviewLineItems: Array<any>;
  public totalApprovedLineItems: number;
  public totalNotApprovedLineItems: number;
  public totalNeedsReviewLineItems: number;
  public maxPageDisplay: number = 7;
  public searchSKUText: string;
  // public totalPages: number;
  public currentPageApproved: number = 1;
  public currentPageNotApproved: number = 1;
  public currentPageNeedsReview: number = 1;
  public lineItemsLimitPerPage: number = 100;
  public creatingTransferOrder: boolean = false;
  public creatingPurchaseOrderVend: boolean = false;
  public reportStates: any = constants.REPORT_STATES;
  public isWarehouser: boolean = false;
  public boxes: Array<any> = [];
  public selectedBox = null;
  public editable: boolean;
  private subscriptions: Subscription[] = [];
  public sortAscending = true;
  public sortColumn = 'productModelSku';
  public emailModalData: any = {
    sendEmail: true,
    to: '',
    cc: '',
    bcc: '',
  };
  public showAddProductModal = false;
  public bsModalRef: BsModalRef;
  public toValidEmailCounter: number = 0;
  public toInvalidEmailCounter: number = 0;
  public ccValidEmailCounter: number = 0;
  public ccInvalidEmailCounter: number = 0;
  public bccValidEmailCounter: number = 0;
  public bccInvalidEmailCounter: number = 0;
  public searchEntry = '';
  public isSmallDevice = this.sharedDataService.getIsSmallDevice();
  selectedCategoryLabelFilter: string;

  @ViewChild(BaseChartDirective) chart: BaseChartDirective;

  constructor(private orgModelApi: OrgModelApi,
              private _route: ActivatedRoute,
              private _router: Router,
              private toastr: ToastrService,
              private _userProfileService: UserProfileService,
              private _eventSourceService: EventSourceService,
              private auth: LoopBackAuth,
              private modalService: BsModalService,
              private sharedDataService: SharedDataService) {
  }

  ngOnInit() {
    this.userProfile = this._userProfileService.getProfileData();
    this._route.data.subscribe((data: any) => {
        this.order = data.stockOrderDetails[0];
        this.emailModalData.to = this.order.supplierModel ? ( this.order.supplierModel.email ? this.order.supplierModel.email : '') : '';
        if (Array.isArray(this.emailModalData.to)) {
          this.emailModalData.to = this.emailModalData.to.join(',')
        }
        this.reloadData();
      },
      error => {
        console.log('error', error)
      });


    if (this.order.state === constants.REPORT_STATES.GENERATED ||
      this.order.state === constants.REPORT_STATES.APPROVAL_IN_PROCESS ||
      this.order.state === constants.REPORT_STATES.ERROR_SENDING_TO_SUPPLIER ||
      this.order.state === constants.REPORT_STATES.PROCESSING_FAILURE) {
      this.editable = true;
    }

    //update order to state "Approval in Process" from "Generated"
    if (this.order.state === constants.REPORT_STATES.GENERATED) {
      this.orgModelApi.updateByIdReportModels(this.userProfile.orgModelId, this.order.id, {
        state: constants.REPORT_STATES.APPROVAL_IN_PROCESS
      })
        .subscribe((data: any) => {
          console.log('updated report state to approval in process', data);
        });
    }
  }

  getApprovedStockOrderLineItems(limit?: number, skip?: number, productModelIds?: Array<string>) {
    if (!(limit && skip)) {
      limit = this.lineItemsLimitPerPage || 100;
      skip = 0;
    }
    let sortOrder = this.sortAscending ? 'ASC' : 'DESC';
    let whereFilter = {
      reportModelId: this.order.id,
      approved: true
    };
    if (productModelIds && productModelIds.length) {
      // Remove filter in case of search
      this.selectedCategoryLabelFilter = undefined;
      whereFilter['productModelId'] = {
        inq: productModelIds
      };
    }
    else if (this.selectedCategoryLabelFilter) {
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
      reportModelId: this.order.id,
      approved: true
    };
    if (productModelIds && productModelIds.length) {
      countFilter['productModelId'] = {inq: productModelIds};
    } else if (this.selectedCategoryLabelFilter) {
      countFilter['categoryModelName'] = this.selectedCategoryLabelFilter;
    }
    this.loading = true;
    let fetchLineItems = combineLatest(
      this.orgModelApi.getStockOrderLineitemModels(this.userProfile.orgModelId, filter),
      this.orgModelApi.countStockOrderLineitemModels(this.userProfile.orgModelId, countFilter));
    fetchLineItems.subscribe((data: any) => {
        this.loading = false;
        this.currentPageApproved = (skip / this.lineItemsLimitPerPage) + 1;
        this.totalApprovedLineItems = data[1].count;
        this.approvedLineItems = data[0];
        this.approvedLineItems.forEach(x => {
          x.isCollapsed = true;
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

  getNotApprovedStockOrderLineItems(limit?: number, skip?: number, productModelIds?: Array<string>) {
    if (!(limit && skip)) {
      limit = this.lineItemsLimitPerPage || 100;
      skip = 0;
    }
    let sortOrder = this.sortAscending ? 'ASC' : 'DESC';
    let whereFilter = {
      reportModelId: this.order.id,
      approved: false
    };
    if (productModelIds && productModelIds.length) {
      // Remove filter in case of search
      this.selectedCategoryLabelFilter = undefined;
      whereFilter['productModelId'] = {
        inq: productModelIds
      };
    }
    else if (this.selectedCategoryLabelFilter) {
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
      reportModelId: this.order.id,
      approved: false
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
        this.currentPageNotApproved = (skip / this.lineItemsLimitPerPage) + 1;
        this.totalNotApprovedLineItems = data[1].count;
        this.notApprovedLineItems = data[0];
        this.notApprovedLineItems.forEach(x => {
          x.isCollapsed = true;
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

  getNeedsReviewStockOrderLineItems(limit?: number, skip?: number, productModelIds?: Array<string>) {
    if (!(limit && skip)) {
      limit = this.lineItemsLimitPerPage || 100;
      skip = 0;
    }
    let sortOrder = this.sortAscending ? 'ASC' : 'DESC';
    let whereFilter = {
      reportModelId: this.order.id,
      approved: null
    };
    if (productModelIds && productModelIds.length) {
      whereFilter['productModelId'] = {
        inq: productModelIds
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
      reportModelId: this.order.id,
      approved: null
    };
    if (productModelIds && productModelIds.length)
      countFilter['productModelId'] = {inq: productModelIds};
    else if (this.selectedCategoryLabelFilter) {
      countFilter['categoryModelName'] = this.selectedCategoryLabelFilter
    }
    this.loading = true;
    let fetchLineItems = combineLatest(
      this.orgModelApi.getStockOrderLineitemModels(this.userProfile.orgModelId, filter),
      this.orgModelApi.countStockOrderLineitemModels(this.userProfile.orgModelId, countFilter));
    fetchLineItems.subscribe((data: any) => {
        this.loading = false;
        this.currentPageNeedsReview = (skip / this.lineItemsLimitPerPage) + 1;
        this.totalNeedsReviewLineItems = data[1].count;
        this.needsReviewLineItems = data[0];
        this.needsReviewLineItems.forEach(x => {
          x.isCollapsed = true;
        });
      },
      err => {
        this.loading = false;
        console.log('error', err);
      });
  }

  searchProductBySku(sku?: string) {
    this.loading = true;
    var pattern = new RegExp('.*' + sku + '.*', "i");
    /* case-insensitive RegExp search */
    var filterData = pattern.toString();
    this.orgModelApi.getProductModels(this.userProfile.orgModelId, {
      where: {
        sku: {"regexp": filterData}
      }
    })
      .subscribe((data) => {
        this.loadStockItemsByProducts(data);
      })
  }

  loadStockItemsByProducts(data: any) {
    if (data.length) {
      var productModelIds = data.map(function filterProductIds(eachProduct) {
        return eachProduct.id;
      });
      this.getApprovedStockOrderLineItems(this.lineItemsLimitPerPage, 0, productModelIds);
      this.getNotApprovedStockOrderLineItems(this.lineItemsLimitPerPage, 0, productModelIds);
      this.getNeedsReviewStockOrderLineItems(this.lineItemsLimitPerPage, 0, productModelIds);
    }
    else {
      this.loading = false;
      this.currentPageNotApproved = 1;
      this.totalNotApprovedLineItems = 0;
      this.notApprovedLineItems = [];
      this.approvedLineItems = [];
      this.totalApprovedLineItems = 0;
      this.currentPageApproved = 1;
      this.needsReviewLineItems = [];
      this.totalNeedsReviewLineItems = 0;
      this.currentPageNeedsReview = 1;
    }
  };

  createTransferOrder() {
    if (!this.totalApprovedLineItems) {
      this.toastr.error('Please approve at least one item to create Transfer Order in MSD');
    } else {
      this.creatingTransferOrder = true;
      this.loading = true;
      this.orgModelApi.createTransferOrderMSD(
        this.userProfile.orgModelId,
        this.order.id,
        this.emailModalData.sendEmail,
        {
          to: this.emailModalData.to.split(','),
          cc: this.emailModalData.cc ? this.emailModalData.cc.split(',') : [],
          bcc: this.emailModalData.bcc ? this.emailModalData.bcc.split(',') : []
        }
      ).subscribe(transferOrderRequest => {
        this.loading = false;
        this.toastr.info('Creating Transfer Order');
        this._router.navigate(['/orders/stock-orders']);
        // this.waitForGeneration(transferOrderRequest.callId);
      }, error1 => {
        this.loading = false;
        this.creatingTransferOrder = false;
        this.toastr.error('Error in creating transfer order in MSD')
      });
    }
  }

  toEmailValidation() {
    this.toValidEmailCounter = 0;
    this.toInvalidEmailCounter = 0;
    this.emailModalData.to = this.emailModalData.to + ' ';
    const toEmailArray = this.emailModalData.to.split(',');
    if (toEmailArray.length === 1 && toEmailArray[0] === ' '){
      return;
    }
    if (toEmailArray.length) {
      toEmailArray.forEach(eachEmail => {
        if (Utils.validateEmail(eachEmail.trim())) {
          this.toValidEmailCounter++;
        }
        else {
          this.toInvalidEmailCounter++;
        }
      })
    }
  }

  toEmailEmpty() {
    this.emailModalData.to = this.emailModalData.to.trim();
    if (this.emailModalData.to === '') {
      this.toValidEmailCounter = 0;
      this.toInvalidEmailCounter = 0;
    }
  }

  ccEmailValidation() {
    this.ccValidEmailCounter = 0;
    this.ccInvalidEmailCounter = 0;
    this.emailModalData.cc = this.emailModalData.cc + ' ';
    const toEmailArray = this.emailModalData.cc.split(',');
    if (toEmailArray.length === 1 && toEmailArray[0] === ' '){
      return;
    }
    if (toEmailArray.length) {
      toEmailArray.forEach(eachEmail => {
        if (Utils.validateEmail(eachEmail.trim())) {
          this.ccValidEmailCounter++;
        }
        else {
          this.ccInvalidEmailCounter++;
        }
      })
    }
  }

  ccEmailEmpty() {
    this.emailModalData.cc = this.emailModalData.cc.trim();
    if (this.emailModalData.cc === '') {
      this.ccValidEmailCounter = 0;
      this.ccInvalidEmailCounter = 0;
    }
  }

  bccEmailValidation() {
    this.bccValidEmailCounter = 0;
    this.bccInvalidEmailCounter = 0;
    this.emailModalData.bcc = this.emailModalData.bcc + ' ';
    const toEmailArray = this.emailModalData.bcc.split(',');
    if (toEmailArray.length === 1 && toEmailArray[0] === ' '){
      return;
    }
    if (toEmailArray.length) {
      toEmailArray.forEach(eachEmail => {
        if (Utils.validateEmail(eachEmail.trim())) {
          this.bccValidEmailCounter++;
        }
        else {
          this.bccInvalidEmailCounter++;
        }
      })
    }
  }

  bccEmailEmpty() {
    this.emailModalData.bcc = this.emailModalData.bcc.trim();
    if (this.emailModalData.bcc === '') {
      this.bccValidEmailCounter = 0;
      this.bccInvalidEmailCounter = 0;
    }
  }

  createPurchaseOrderVend() {
    if (this.totalNeedsReviewLineItems > 0 ){
      this.toastr.error('Please review remaining items');
    }
    else if (!this.totalApprovedLineItems) {
      this.toastr.error('Please approve at least one item to send order to supplier');
    } else {
      if (this.emailModalData.sendEmail) {
        if (
          !Utils.validateEmail(this.emailModalData.to.split(',')) || !Utils.validateEmail(this.emailModalData.cc.split(',')) || !Utils.validateEmail(this.emailModalData.bcc.split(','))
        ) {
          this.toastr.error('Invalid Email');
          return;
        }
      }
      this.creatingPurchaseOrderVend = true;
      this.loading = true;
      this.toastr.info('Creating Purchase Order');
      this.orgModelApi.createPurchaseOrderVend(
        this.userProfile.orgModelId,
        this.order.id,
        this.emailModalData.sendEmail,
        {
          to: this.emailModalData.to ? this.emailModalData.to.split(',') : [],
          cc: this.emailModalData.cc ? this.emailModalData.cc.split(',') : [],
          bcc: this.emailModalData.bcc ? this.emailModalData.bcc.split(',') : []
        }
      ).subscribe(purchaseOrderRequest => {
        this.loading = false;
        if (this.emailModalData.sendEmail) {
          this.toastr.success('Sent email successfully');
        }
        this.toastr.info('Pushing purchase order to Vend');
        this._router.navigate(['/orders/stock-orders']);
      }, error1 => {
        this.creatingPurchaseOrderVend = false;
        this.loading = false;
        this.toastr.error('Error in sending order to supplier')
      });
    }
  }

  removeItemFromList(lineItems, list, count , success) {
    let popedItem;
    const index = list.findIndex((item) => item.id === lineItems.id);
    if (index > -1) {
      popedItem = list[index];
      list.splice(index, 1)
      if (list.length === 0 &&  count > 0){
        this.reloadData();
      }
      success();
    }
    return popedItem;
  }

  addItemToList(lineItems, list, success) {
    list.push(lineItems);
    success();
  }

  moveItemToAnotherList(lineItems, data) {
    let popedItem;
    if (lineItems.approved === true) {
      popedItem = this.removeItemFromList(
        lineItems,
        this.approvedLineItems,
        this.totalApprovedLineItems,
        () => this.totalApprovedLineItems-- );
    } else if (lineItems.approved === false) {
      popedItem = this.removeItemFromList(
        lineItems,
        this.notApprovedLineItems,
        this.totalNotApprovedLineItems,
        () => this.totalNotApprovedLineItems-- );
    } else if (lineItems.approved === null) {
      popedItem = this.removeItemFromList(
        lineItems,
        this.needsReviewLineItems,
        this.totalNeedsReviewLineItems,
        () => this.totalNeedsReviewLineItems-- );
    }

    popedItem.approved = data.approved;
    if (data.orderQuantity) {
      popedItem.orderQuantity = data.orderQuantity;
    }

    if (data.approved === true) {
      this.addItemToList(
        lineItems,
        this.approvedLineItems,
        () => this.totalApprovedLineItems++ );
    } else if (data.approved === false) {
      this.addItemToList(
        lineItems,
        this.notApprovedLineItems,
        () => this.totalNotApprovedLineItems++ );
    } else if (data.approved === null){
      this.addItemToList(
        lineItems,
        this.needsReviewLineItems,
        () => this.totalNeedsReviewLineItems++);
    }
  }

  updateLineItems(lineItems, data: any) {
    // Approve All Button Click when no items are present
    if (data.approved === true && this.totalNeedsReviewLineItems + this.totalNotApprovedLineItems + this.totalApprovedLineItems === 0) {
      this.toastr.error('No Items to Approve');
      return
    }
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
        if (lineItems) { // if ids / object is passed
          if (res.count === 0) {
            this.toastr.error('Failed to update order item')
            return;
          }
          if (lineItems instanceof Array) {
            lineItems.forEach(item => {
              this.moveItemToAnotherList(item, data);
            });
            this.loading = false;
          } else {
            this.moveItemToAnotherList(lineItems, data);
            this.loading = false;
          }
        } else { // bulk update happened
          this.refreshLineItems();
        }
      },
        err => {
          console.log('err', err);
          this.loading = false;
        });
  }

  approveItem(lineItem) {
    if (lineItem.orderQuantity > 0) {
      this.updateLineItems(lineItem, {
        approved: true,
        orderQuantity: lineItem.orderQuantity
      });
    }
    else {
      this.toastr.error('Quantity cannot be less than 1');
    }
  }

  removeItem(lineItem, approved: boolean = false) {
    this.updateLineItems(lineItem, {approved});
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
            this.reloadData();
          }
          this.loading = false;
        },
        err => {
          this.loading = false;
          this.toastr.error('Error updating order state, please refresh');
        });
  };

  downloadOrderCSV() {
    this.loading = true;
    this.orgModelApi.downloadReportModelCSV(this.userProfile.orgModelId, this.order.id).subscribe((data) => {
      const link = document.createElement('a');
      link.href = data;
      link.download = this.order.name;
      link.click();
      this.loading = false;
    }, err => {
      this.loading = false;
      console.log(err);
    })
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(subscription => {
      if (subscription) {
        subscription.unsubscribe()
      }
    })
  }

  collapsed(event: any): void {
    // console.log(event);
  }

  expanded(event: any): void {
    // console.log(event);
  }

  setDesiredStockLevelForVend(lineItem) {
    this.loading = true;
    this.orgModelApi.setDesiredStockLevelForVend(
      this.userProfile.orgModelId,
      this.order.storeModelId,
      lineItem.productModelId,
      lineItem.desiredStockLevel)
      .subscribe((data: any) => {
          this.toastr.success('Updated desired stock level successfully');
          this.loading = false;
        },
        err => {
          this.toastr.error('Error updating desired stock level');
          this.loading = false;
          console.log(err);
        });
  }

  increaseDSL(lineItem) {
    lineItem.desiredStockLevel += 1;
    this.adjustOrderQuantityWithDSL(lineItem);
  }

  decreaseDSL(lineItem) {
    lineItem.desiredStockLevel -= 1;
    this.adjustOrderQuantityWithDSL(lineItem);
  }

  adjustOrderQuantityWithDSL(lineItem) {
    lineItem.orderQuantity = lineItem.desiredStockLevel - lineItem.storeInventory;
    if (lineItem.caseQuantity && (lineItem.orderQuantity % lineItem.caseQuantity) !== 0) {
      lineItem.orderQuantity = Math.ceil(lineItem.orderQuantity / lineItem.caseQuantity) * lineItem.caseQuantity;
    }
  }

  addProductToStockOrder(productModel: any) {
    if (!productModel.orderQuantity) {
      this.toastr.error('Order Quantity should be greater than zero');
      return;
    }
    this.orgModelApi.addProductToStockOrder(
      this.userProfile.orgModelId,
      this.order.id,
      this.order.storeModelId,
      productModel
    ).subscribe(result => {
      this.toastr.success('Added product to stock order');
    }, error => {
      this.toastr.error('Cannot add product to stock order');
    })
  }

  openDeleteModal() {
    this.bsModalRef = this.modalService.show(DeleteOrderComponent, {initialState: {orderId: this.order.id}});
  }

  keyUpEvent(event, searchSKUText) {
    if (event.keyCode == '13') {
      this.searchProductBySku(searchSKUText)
    }
  }

  reloadData() {
    // This will avoid switching to page 1 on each approval
    this.getNotApprovedStockOrderLineItems(this.lineItemsLimitPerPage, (this.currentPageNotApproved - 1 ) * this.lineItemsLimitPerPage);
    this.getApprovedStockOrderLineItems(this.lineItemsLimitPerPage, (this.currentPageApproved - 1 ) * this.lineItemsLimitPerPage);
    this.getNeedsReviewStockOrderLineItems(this.lineItemsLimitPerPage, (this.currentPageNeedsReview - 1 ) * this.lineItemsLimitPerPage);
  }

  refreshLineItems() {
    this.getNeedsReviewStockOrderLineItems();
    this.getApprovedStockOrderLineItems();
    this.getNotApprovedStockOrderLineItems();
  }

  approveAll() {
    this.orgModelApi.updateAllStockOrderLineItemModels(
      this.userProfile.orgModelId,
      this.order.id,
      [],
      { approved: true },
      {approved: null})
      .subscribe((res: any) => {
          this.reloadData();
        },
        err => {
          console.log('err', err);
          this.loading = false;
        });
  }
}
