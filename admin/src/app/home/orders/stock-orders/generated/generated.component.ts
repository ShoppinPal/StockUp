import {Component, OnDestroy, OnInit} from '@angular/core';
import {OrgModelApi} from "../../../../shared/lb-sdk/services/custom/OrgModel";
import {ActivatedRoute, Router} from '@angular/router';
import {Observable, combineLatest, Subscription} from 'rxjs';
import {ToastrService} from 'ngx-toastr';
import {UserProfileService} from "../../../../shared/services/user-profile.service";
import {LoopBackAuth} from "../../../../shared/lb-sdk/services/core/auth.service";
import {constants} from "../../../../shared/constants/constants";
import {DatePipe} from '@angular/common';
import {EventSourceService} from '../../../../shared/services/event-source.service';

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
  public totalApprovedLineItems: number;
  public totalNotApprovedLineItems: number;
  public maxPageDisplay: number = 7;
  public searchSKUText: string;
  // public totalPages: number;
  public currentPageApproved: number = 1;
  public currentPageNotApproved: number = 1;
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

  constructor(private orgModelApi: OrgModelApi,
              private _route: ActivatedRoute,
              private _router: Router,
              private toastr: ToastrService,
              private _userProfileService: UserProfileService,
              private _eventSourceService: EventSourceService,
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

  getApprovedStockOrderLineItems(limit?: number, skip?: number, productModelId?: string) {
    if (!(limit && skip)) {
      limit = 100;
      skip = 0;
    }
    let sortOrder = this.sortAscending ? 'ASC' : 'DESC';
    let filter = {
      where: {
        reportModelId: this.order.id,
        approved: true,
        productModelId: productModelId
      },
      include: [
        {
          relation: 'productModel'
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
    if (productModelId)
      countFilter['productModelId'] = productModelId;
    this.loading = true;
    let fetchLineItems = combineLatest(
      this.orgModelApi.getStockOrderLineitemModels(this.userProfile.orgModelId, filter),
      this.orgModelApi.countStockOrderLineitemModels(this.userProfile.orgModelId, countFilter));
    fetchLineItems.subscribe((data: any) => {
        this.loading = false;
        this.currentPageApproved = (skip / this.lineItemsLimitPerPage) + 1;
        this.totalApprovedLineItems = data[1].count;
        this.approvedLineItems = data[0];
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
    let sortOrder = this.sortAscending ? 'ASC' : 'DESC';
    let filter = {
      where: {
        reportModelId: this.order.id,
        approved: false,
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
      order: 'categoryModelName ' + sortOrder + ', ' + this.sortColumn + ' ' + sortOrder
    };
    let countFilter = {
      reportModelId: this.order.id,
      approved: false
    };
    if (productModelId)
      countFilter['productModelId'] = productModelId;
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
        })
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
        sku: {
          like: sku
        }
      }
    }).subscribe((data: any) => {
      if (data.length) {
        this.getApprovedStockOrderLineItems(1, 0, data[0].id);
        this.getNotApprovedStockOrderLineItems(1, 0, data[0].id);
      }
      else {
        this.loading = false;
        this.currentPageNotApproved = 1;
        this.totalNotApprovedLineItems = 0;
        this.notApprovedLineItems = [];
        this.approvedLineItems = [];
        this.totalApprovedLineItems = 0;
        this.currentPageApproved = 1;
      }
    })
  }

  createTransferOrder() {
    console.log('submitting');
    if (!this.totalApprovedLineItems) {
      this.toastr.error('Please approve at least one item to create Transfer Order in MSD');
    } else {
      this.creatingTransferOrder = true;
      this.loading = true;
      this.orgModelApi.createTransferOrderMSD(
        this.userProfile.orgModelId,
        this.order.id
      ).subscribe(transferOrderRequest => {
        this.loading = false;
        this.toastr.info('Creating Transfer Order');
        this.waitForGeneration(transferOrderRequest.callId);
      }, error1 => {
        this.loading = false;
        this.toastr.error('Error in creating transfer order in MSD')
      });
    }
  }

  createPurchaseOrderVend() {
    if (!this.totalApprovedLineItems) {
      this.toastr.error('Please approve at least one item to send order to supplier');
    } else {
      this.creatingPurchaseOrderVend = true;
      this.loading = true;
      this.orgModelApi.createPurchaseOrderVend(
        this.userProfile.orgModelId,
        this.order.id
      ).subscribe(purchaseOrderRequest => {
        this.loading = false;
        this.toastr.info('Creating Purchase Order');
        this.waitForGeneration(purchaseOrderRequest.callId);
      }, error1 => {
        this.loading = false;
        this.toastr.error('Error in sending order to supplier')
      });
    }
  }

  updateLineItems(lineItems, data: any) {
    // Approve All Button Click when no items are present
    if (data.approved && this.totalNotApprovedLineItems + this.totalApprovedLineItems === 0) {
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
          this.getApprovedStockOrderLineItems();
          this.getNotApprovedStockOrderLineItems();
          console.log('approved', res);
        },
        err => {
          console.log('err', err);
          this.loading = false;
        });
  }

  approveItem(lineItem) {
    this.updateLineItems(lineItem, {
      approved: true,
      orderQuantity: lineItem.orderQuantity
    });
  }

  removeItem(lineItem) {
    this.updateLineItems(lineItem, {approved: false});
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

  waitForGeneration(callId) {
    const EventSourceUrl = `/notification/${callId}/waitForResponse`;
    this.subscriptions.push(
      this._eventSourceService.connectToStream(EventSourceUrl)
        .subscribe(([event, es]) => {
          if (event.data.success === true) {
            es.close();
            this.creatingPurchaseOrderVend = false;
            this.creatingTransferOrder = false;
            this._router.navigate(['/orders/stock-orders']);
            this.toastr.success('Order sent successfully');
          } else {
            this.creatingPurchaseOrderVend = false;
            this.creatingTransferOrder = false;
            this.toastr.error('Error in sending order to supplier');
          }
        })
    );
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

  addComment(lineItem) {
    if (!lineItem.comment) {
      this.toastr.error('Please write a comment first');
    }
    else {
      this.loading = true;
      this.orgModelApi.createCommentModels(this.userProfile.orgModelId, {
        comment: lineItem.comment,
        userModelId: this.userProfile.userId,
        stockOrderLineitemModelId: lineItem.id
      })
        .subscribe(data => {
            this.loading = false;
            let newComment = lineItem.comment;
            lineItem.comment = null;
            this.toastr.success('Comment added successfully');
            lineItem.commentModels.push({
              comment: newComment,
              userModel: {
                name: this.userProfile.name
              },
              createdAt: new Date()
            });
          },
          error => {
            this.loading = false;
            this.toastr.error('Could not add comment');
            console.log(error);
          });
    }

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

}
