import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
} from "@angular/core";
import { OrgModelApi } from "../../../../shared/lb-sdk/services/custom/OrgModel";
import { ActivatedRoute, Router } from "@angular/router";
import { Observable, combineLatest, Subscription } from "rxjs";
import { ToastrService } from "ngx-toastr";
import { UserProfileService } from "../../../../shared/services/user-profile.service";
import { LoopBackAuth } from "../../../../shared/lb-sdk/services/core/auth.service";
import { constants } from "../../../../shared/constants/constants";
import { DatePipe } from "@angular/common";
import { EventSourceService } from "../../../../shared/services/event-source.service";
import { ModalDirective } from "ngx-bootstrap";
import { BsModalRef, BsModalService } from "ngx-bootstrap/modal";
import { DeleteOrderComponent } from "../../shared-components/delete-order/delete-order.component";
import { SharedDataService } from "../../../../shared/services/shared-data.service";
import Utils from "../../../../shared/constants/utils";
import Dexie from "dexie";
import { BarcodeReceiveService } from "app/shared/services/barcodescan.service";
import { productDB } from "app/shared/services/indexdb.service";

@Component({
  selector: "app-receive",
  templateUrl: "./receive.component.html",
  styleUrls: ["./receive.component.scss"],
})
export class ReceiveComponent implements OnInit, OnDestroy {
  @ViewChild("discrepancyModal") public discrepancyModal: ModalDirective;
  @ViewChild("searchInput") public searchInputRef: ElementRef;

  public userProfile: any;
  public loading = false;
  public filter: any = {};
  public order: any = {};
  public discrepancyLineItems: Array<any>;
  public backOrderedLineItems: Array<any>;
  public receivedLineItems: Array<any>;
  public notReceivedLineItems: Array<any>;
  public totalBackOrderedLineItems: number;
  public totalDiscrepanciesLineItems: number;
  public totalReceivedLineItems: number;
  public totalNotReceivedLineItems: number;
  public maxPageDisplay: number = 7;
  public searchSKUText: string = "";
  public totalPages: number;
  public currentPageBackOrdered: number = 1;
  public currentPageDiscrepancies: number = 1;
  public currentPageReceived: number = 1;
  public currentPageNotReceived: number = 1;
  public lineItemsLimitPerPage: number = 1;
  public creatingTransferOrder: boolean = false;
  public creatingPurchaseOrderVend: boolean = false;
  public reportStates: any = constants.REPORT_STATES;
  public isWarehouser: boolean = false;
  public editable: boolean = false;
  public searchSKUFocused: boolean = true;
  public enableBarcode: boolean = true;
  public discrepancyOrderItem: any;
  private subscriptions: Subscription[] = [];
  public sortAscending = true;
  public sortColumn = "productModelSku";
  showAddProductModal: boolean;
  public bsModalRef: BsModalRef;
  public isSmallDevice = this.sharedDataService.getIsSmallDevice();
  public isDiscrepancyLoaded = false;
  public editingDamagedForItemId;
  public damagedQuantity = 0;

  @ViewChild("discrepancies") discrepanciesTab;
  sendDiscrepancyReport: any = "true";
  selectedCategoryLabelFilter: string;

  constructor(
    private orgModelApi: OrgModelApi,
    private _route: ActivatedRoute,
    private _router: Router,
    private toastr: ToastrService,
    private _userProfileService: UserProfileService,
    private _eventSourceService: EventSourceService,
    private auth: LoopBackAuth,
    private modalService: BsModalService,
    private sharedDataService: SharedDataService,
    private barcodeReceiveService: BarcodeReceiveService
  ) {}

  ngOnInit() {
    this.userProfile = this._userProfileService.getProfileData();
    this._route.data.subscribe(
      (data: any) => {
        this.order = data.stockOrderDetails[0];
        this.refreshData();
        this.getBackOrderedStockOrderLineItems();
      },
      (error) => {
        console.log("error", error);
      }
    );

    //update order to state "Approval in Process" from "Generated"
    if (this.order.state === constants.REPORT_STATES.RECEIVING_PENDING) {
      this.orgModelApi
        .updateByIdReportModels(this.userProfile.orgModelId, this.order.id, {
          state: constants.REPORT_STATES.RECEIVING_IN_PROCESS,
        })
        .subscribe((data: any) => {
          console.log("updated report state to receiving in process", data);
        });
    }

    if (
      this.order.state === constants.REPORT_STATES.RECEIVING_PENDING ||
      this.order.state === constants.REPORT_STATES.RECEIVING_IN_PROCESS ||
      this.order.state === constants.REPORT_STATES.RECEIVING_FAILURE
    ) {
      this.editable = true;
    }
  }

  async getReceivedStockOrderLineItems(
    limit?: number,
    skip?: number,
    productModelIds?: Array<string>
  ) {
    if (!(limit && skip)) {
      limit = this.lineItemsLimitPerPage || 100;
      skip = 0;
    }
    if (
      productModelIds !== undefined &&
      productModelIds !== null &&
      !productModelIds &&
      !productModelIds.length
    ) {
      this.searchSKUText = "";
    }
    let sortOrder = this.sortAscending ? "ASC" : "DESC";
    let whereFilter = {
      reportModelId: this.order.id,
      fulfilled: true,
      receivedQuantity: {
        gt: 0,
      },
    };
    if (productModelIds && productModelIds.length) {
      // Remove filter in case of search
      this.selectedCategoryLabelFilter = undefined;
      whereFilter["productModelId"] = {
        inq: productModelIds,
      };
    } else if (this.selectedCategoryLabelFilter) {
      whereFilter["categoryModelName"] = this.selectedCategoryLabelFilter;
    }
    const filter: any = {
      where: whereFilter,
      include: [
        {
          relation: "productModel",
        },
        {
          relation: "commentModels",
          scope: {
            include: "userModel",
          },
        },
      ],
      limit: limit,
      skip: skip,
      order:
        "categoryModelName " +
        sortOrder +
        ", " +
        this.sortColumn +
        " " +
        sortOrder,
    };
    let countFilter = {
      reportModelId: this.order.id,
      fulfilled: true,
      receivedQuantity: {
        gt: 0,
      },
    };
    if (productModelIds && productModelIds.length) {
      countFilter["productModelId"] = { inq: productModelIds };
    } else if (this.selectedCategoryLabelFilter) {
      countFilter["categoryModelName"] = this.selectedCategoryLabelFilter;
    }
    this.loading = true;
    let fetchLineItems = combineLatest(
      this.orgModelApi.getStockOrderLineitemModels(
        this.userProfile.orgModelId,
        filter
      ),
      this.orgModelApi.countStockOrderLineitemModels(
        this.userProfile.orgModelId,
        countFilter
      )
    );

    // 1. Delete all line items
    await productDB.products.clear();

    fetchLineItems.subscribe(
      (data: any) => {
        const products = data[0];

        // TODO: 1. Add Data to IndexDB here
        productDB.products
          .bulkAdd(products)
          .then(() => {
            this.loading = false;
            this.currentPageReceived = skip / this.lineItemsLimitPerPage + 1;
            this.totalReceivedLineItems = data[1].count;
            this.receivedLineItems = data[0];
            this.receivedLineItems.forEach((x) => {
              x.isCollapsed = true;
            });
          })
          .catch((err) => {
            console.log("Error in bulk add", err);
          });
      },
      (err) => {
        this.loading = false;
        console.log("error", err);

        // Clear selected filter if api call fails
        if (this.selectedCategoryLabelFilter) {
          this.selectedCategoryLabelFilter = undefined;
        }
      }
    );
  }

  getNotReceivedStockOrderLineItems(
    limit?: number,
    skip?: number,
    productModelIds?: Array<string>
  ) {
    if (!(limit && skip)) {
      limit = this.lineItemsLimitPerPage || 100;
      skip = 0;
    }
    if (
      productModelIds !== undefined &&
      productModelIds !== null &&
      !productModelIds &&
      !productModelIds.length
    ) {
      this.searchSKUText = "";
    }
    let sortOrder = this.sortAscending ? "ASC" : "DESC";
    let whereFilter = {
      reportModelId: this.order.id,
      fulfilled: true,
      received: false,
    };
    if (productModelIds && productModelIds.length) {
      // Remove filter in case of search
      this.selectedCategoryLabelFilter = undefined;
      whereFilter["productModelId"] = {
        inq: productModelIds,
      };
    } else if (this.selectedCategoryLabelFilter) {
      whereFilter["categoryModelName"] = this.selectedCategoryLabelFilter;
    }

    let filter = {
      where: whereFilter,
      include: [
        {
          relation: "productModel",
        },
        {
          relation: "commentModels",
          scope: {
            include: "userModel",
          },
        },
      ],
      limit: limit,
      skip: skip,
      order:
        "categoryModelName " +
        sortOrder +
        ", " +
        this.sortColumn +
        " " +
        sortOrder,
    };
    let countFilter = {
      reportModelId: this.order.id,
      fulfilled: true,
      received: false,
    };
    if (productModelIds && productModelIds.length) {
      countFilter["productModelId"] = { inq: productModelIds };
    } else if (this.selectedCategoryLabelFilter) {
      countFilter["categoryModelName"] = this.selectedCategoryLabelFilter;
    }
    this.loading = true;
    let fetchLineItems = combineLatest(
      this.orgModelApi.getStockOrderLineitemModels(
        this.userProfile.orgModelId,
        filter
      ),
      this.orgModelApi.countStockOrderLineitemModels(
        this.userProfile.orgModelId,
        countFilter
      )
    );
    fetchLineItems.subscribe(
      (data: any) => {
        this.loading = false;
        this.currentPageNotReceived = skip / this.lineItemsLimitPerPage + 1;
        this.totalNotReceivedLineItems = data[1].count;
        for (var i = 0; i < data[0].length; i++) {
          // Prefill value if  Manual mode && Nothing has been recieved yet
          if (!this.enableBarcode && data[0][i].receivedQuantity === 0) {
            data[0][i].receivedQuantity = data[0][i].fulfilledQuantity;
          }
          data[0][i].isCollapsed = true;
        }
        this.notReceivedLineItems = data[0];
      },
      (err) => {
        this.loading = false;
        console.log("error", err);

        // Clear selected filter if api call fails
        if (this.selectedCategoryLabelFilter) {
          this.selectedCategoryLabelFilter = undefined;
        }
      }
    );
  }

  getBackOrderedStockOrderLineItems(limit?: number, skip?: number) {
    if (!(limit && skip)) {
      limit = this.lineItemsLimitPerPage || 100;
      skip = 0;
    }
    let sortOrder = this.sortAscending ? 1 : 0;
    let filter = {
      limit: limit,
      skip: skip,
      order: {
        categoryModelName: sortOrder,
        [this.sortColumn]: sortOrder,
      },
      backorderedOnly: true,
      where: {
        categoryModelName: this.selectedCategoryLabelFilter
          ? this.selectedCategoryLabelFilter
          : undefined,
      },
    };
    this.loading = true;

    let fetchLineItems = this.orgModelApi.getDiscrepancyOrBackOrderedLineItems(
      this.userProfile.orgModelId,
      this.order.id,
      filter
    );
    fetchLineItems.subscribe(
      (data: any) => {
        this.loading = false;
        this.currentPageBackOrdered = skip / this.lineItemsLimitPerPage + 1;
        this.totalBackOrderedLineItems = data.count;
        for (var i = 0; i < data.data.length; i++) {
          data.data[i].isCollapsed = true;
        }
        this.backOrderedLineItems = data.data;
      },
      (err) => {
        this.loading = false;
        console.log("error", err);
      }
    );
  }

  getDiscrepanciesForOrder(limit?: number, skip?: number) {
    if (!(limit && skip)) {
      limit = this.lineItemsLimitPerPage || 100;
      skip = 0;
    }
    let sortOrder = this.sortAscending ? 1 : 0;
    let filter = {
      limit: limit,
      skip: skip,
      order: {
        categoryModelName: sortOrder,
        [this.sortColumn]: sortOrder,
      },
      backorderedOnly: false,
      where: {
        categoryModelName: this.selectedCategoryLabelFilter
          ? this.selectedCategoryLabelFilter
          : undefined,
      },
    };
    this.loading = true;

    let fetchLineItems = this.orgModelApi.getDiscrepancyOrBackOrderedLineItems(
      this.userProfile.orgModelId,
      this.order.id,
      filter
    );
    fetchLineItems.subscribe(
      (data: any) => {
        this.loading = false;
        this.currentPageDiscrepancies = skip / this.lineItemsLimitPerPage + 1;
        this.totalDiscrepanciesLineItems = data.count;
        for (var i = 0; i < data.data.length; i++) {
          data.data[i].isCollapsed = true;
        }
        this.discrepancyLineItems = data.data;
        this.discrepancyLineItems.forEach(
          (lineItem) => (lineItem.id = lineItem._id)
        );
        this.isDiscrepancyLoaded = true;
        setTimeout(() =>
          this.discrepanciesTab.nativeElement.scrollIntoView({
            behavior: "smooth",
          })
        );
      },
      (err) => {
        this.loading = false;
        console.log("error", err);
      }
    );
  }

  async searchAndIncrementProduct(sku?: string, force: boolean = false) {
    this.discrepancyModal.hide();
    // this.loading = true;
    this.searchSKUFocused = false;
    this.selectedCategoryLabelFilter = undefined;

    const products = await productDB.products.toArray();

    // TODO: 2. Add a check for the product already exists in indexDB => products.find((item) => item.id === this.order.id)
    const productDataIfExists = products.find(
      (products) => products.productModelSku === sku
    );

    // TODO: 3. If product exists in indexDB, then just update the quantity & call API to update the quantity
    if (productDataIfExists) {
      // 1 Add API to Queue
      this.barcodeReceiveService
        .addToQueue(this.userProfile.orgModelId, this.order.id, sku)
        .catch((error) => {
          this.loading = false;
          this.toastr.error(error.message);

          // 3.3. If API fails, then update the quantity in indexDB
          this.updateReceivedQuantity({
            ...productDataIfExists,
            receivedQuantity: productDataIfExists.receivedQuantity - 1,
          });

          // 3.2. Update the quantity in indexDB
          productDB.products.where({ productModelSku: sku }).modify({
            receivedQuantity: productDataIfExists.receivedQuantity - 1,
          });
        });

      // 3.1. Show in UI
      this.updateReceivedQuantity({
        ...productDataIfExists,
        receivedQuantity: productDataIfExists.receivedQuantity + 1,
      });

      // 3.2. Update the quantity in indexDB
      await productDB.products
        .where({ productModelSku: sku })
        .modify({ receivedQuantity: productDataIfExists.receivedQuantity + 1 });

      // this.scanBarcodeAPI(sku).catch(async (error) => {
      //   this.loading = false;
      //   this.toastr.error(error.message);

      //   // 3.3. If API fails, then update the quantity in indexDB
      //   this.updateReceivedQuantity({
      //     ...productDataIfExists,
      //     receivedQuantity: productDataIfExists.receivedQuantity - 1,
      //   });

      //   // 3.2. Update the quantity in indexDB
      //   productDB.products.where({ productModelSku: sku }).modify({
      //     receivedQuantity: productDataIfExists.receivedQuantity - 1,
      //   });
      // });
    }
  }

  async scanBarcodeAPI(sku?: string, force: boolean = false) {
    this.orgModelApi
      .scanBarcodeStockOrder(
        this.userProfile.orgModelId,
        "receive",
        sku,
        this.order.id,
        force
      )
      .subscribe(
        (searchedOrderItem) => {
          return searchedOrderItem;
        },
        (error) => {
          this.loading = false;
          this.toastr.error(error.message);
          this.searchSKUFocused = true;
          this.notReceivedLineItems = [];
          this.receivedLineItems = [];
          this.totalReceivedLineItems = 0;
          this.totalNotReceivedLineItems = 0;
        }
      );
  }

  updateReceivedQuantity(productDataIfExists: any) {
    if (productDataIfExists.showDiscrepancyAlert) {
      this.discrepancyOrderItem = productDataIfExists;
      this.discrepancyModal.show();
    } else {
      this.toastr.success("Row updated");
    }
    this.searchSKUFocused = true;
    this.receivedLineItems = [productDataIfExists];
    this.totalReceivedLineItems = this.receivedLineItems.length;
    if (!productDataIfExists.received) {
      this.notReceivedLineItems = [productDataIfExists];
    } else {
      this.notReceivedLineItems = [];
    }
    this.totalNotReceivedLineItems = this.notReceivedLineItems.length;
    this.loading = false;
  }

  // searchProductBySku(sku?: string) {
  //   // this.loading = true;
  //   var pattern = new RegExp(".*" + sku + ".*", "i");
  //   /* case-insensitive RegExp search */
  //   var filterData = pattern.toString();

  //   this.searchAndIncrementProduct(sku);
  //   this.orgModelApi
  //     .getProductModels(this.userProfile.orgModelId, {
  //       where: {
  //         sku: { regexp: filterData },
  //       },
  //     })
  //     .subscribe((data: any) => {
  //       if (data.length) {
  //         var productModelIds = data.map(function filterProductIds(
  //           eachProduct
  //         ) {
  //           return eachProduct.id;
  //         });
  //         this.getReceivedStockOrderLineItems(
  //           this.lineItemsLimitPerPage,
  //           0,
  //           productModelIds
  //         );
  //         this.getNotReceivedStockOrderLineItems(
  //           this.lineItemsLimitPerPage,
  //           0,
  //           productModelIds
  //         );
  //       } else {
  //         this.loading = false;
  //         this.currentPageNotReceived = 1;
  //         this.totalNotReceivedLineItems = 0;
  //         this.notReceivedLineItems = [];
  //         this.receivedLineItems = [];
  //         this.totalReceivedLineItems = 0;
  //         this.currentPageReceived = 1;
  //         this.backOrderedLineItems = [];
  //         this.totalBackOrderedLineItems = 0;
  //         this.currentPageBackOrdered = 1;
  //       }
  //     });
  // }

  updateLineItems(lineItems, data: any) {
    this.loading = true;
    let lineItemsIDs: Array<string> = [];
    if (lineItems instanceof Array) {
      for (var i = 0; i < lineItems.length; i++) {
        lineItemsIDs.push(lineItems[i].id);
      }
    } else {
      lineItemsIDs.push(lineItems.id);
    }
    this.orgModelApi
      .updateAllStockOrderLineItemModels(
        this.userProfile.orgModelId,
        this.order.id,
        lineItemsIDs,
        data
      )
      .subscribe(
        (res: any) => {
          if (data.damagedQuantity) {
            this.editingDamagedForItemId = undefined;
            this.getDiscrepanciesForOrder(
              this.lineItemsLimitPerPage,
              (this.currentPageDiscrepancies - 1) * this.lineItemsLimitPerPage
            );
          } else {
            this.refreshData();
          }
          console.log("approved", res);
          this.toastr.success("Row Updated");
        },
        (err) => {
          this.toastr.error("Error Updating Row");
          console.log("err", err);
          this.loading = false;
        }
      );
  }

  receiveItem(lineItem) {
    if (lineItem.receivedQuantity > 0) {
      this.updateLineItems(lineItem, {
        received: true,
        receivedQuantity: lineItem.receivedQuantity,
      });
    } else {
      this.toastr.error("Receiving quantity cannot be less than 1");
    }
  }

  removeItem(lineItem) {
    this.updateLineItems(lineItem, { received: false, receivedQuantity: 0 });
  }

  getOrderDetails() {
    let previousState = this.order.state;
    this.loading = true;
    this.orgModelApi
      .getReportModels(this.userProfile.orgModelId, {
        where: {
          id: this.order.id,
        },
      })
      .subscribe(
        (data: any) => {
          this.order = data[0];
          //fetch line items only if the report status changes from executing to generated
          if (this.order.state !== previousState) {
            this.refreshData();
          }
          this.loading = false;
        },
        (err) => {
          this.loading = false;
          this.toastr.error("Error updating order state, please refresh");
        }
      );
  }

  receiveConsignment() {
    if (!this.totalReceivedLineItems) {
      this.toastr.error(
        "Please receive at least one item to send order to supplier"
      );
    } else {
      this.loading = true;
      this.creatingPurchaseOrderVend = true;
      this.orgModelApi
        .receiveConsignment(
          this.userProfile.orgModelId,
          this.order.id,
          this.totalDiscrepanciesLineItems > 0 &&
            this.sendDiscrepancyReport === "true"
        )
        .subscribe(
          (recieveRequest) => {
            this.toastr.info("Receiving consignment...");
            this._router.navigate(["/orders/stock-orders"]);
            this.loading = false;
            this.waitForRecieveWorker(recieveRequest.callId);
          },
          (error) => {
            this.loading = false;
            this.creatingPurchaseOrderVend = false;
            this.toastr.error("Error in receiving order");
          }
        );
    }
  }

  waitForRecieveWorker(callId) {
    const EventSourceUrl = `/notification/${callId}/waitForResponse`;
    this.subscriptions.push(
      this._eventSourceService
        .connectToStream(EventSourceUrl)
        .subscribe(([event, es]) => {
          console.log(event);
          if (event.data.success === true) {
            es.close();
            this.creatingPurchaseOrderVend = false;
            this._router.navigate(["/orders/stock-orders"]);
            this.toastr.success("Order received successfully");
          } else {
            this.creatingPurchaseOrderVend = false;
            this.toastr.error("Error in receiving order");
          }
        })
    );
  }

  downloadOrderCSV() {
    this.loading = true;
    this.orgModelApi
      .downloadReportModelCSV(this.userProfile.orgModelId, this.order.id)
      .subscribe(
        (data) => {
          const link = document.createElement("a");
          link.href = data;
          link.download = this.order.name;
          link.click();
          this.loading = false;
        },
        (err) => {
          this.loading = false;
          console.log(err);
        }
      );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((subscription) => {
      if (subscription) {
        subscription.unsubscribe();
      }
    });
  }

  /**
   * @description If the scan mode is changed
   * to barcode scanning, then focus is set back to the sku
   * search bar
   */
  changeScanMode() {
    this.refreshLineItems();
    this.searchSKUText = "";
    this.selectedCategoryLabelFilter = undefined;
    if (this.enableBarcode) {
      this.searchSKUFocused = true;
    } else {
      this.searchSKUFocused = false;
    }
  }

  /**
   * @description Code to detect barcode scanner input and
   * calls the search sku function
   * @param searchText
   */
  barcodeSearchSKU($event) {
    if (this.enableBarcode && this.searchSKUText !== "") {
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
    this.bsModalRef = this.modalService.show(DeleteOrderComponent, {
      initialState: { orderId: this.order.id },
    });
  }

  keyUpEvent(event, searchSKUText) {
    if (event.keyCode == "13" && !this.enableBarcode && searchSKUText !== "") {
      // this.searchProductBySku(searchSKUText);
      this.searchAndIncrementProduct(searchSKUText);
    }
  }

  refreshData() {
    this.getReceivedStockOrderLineItems(
      this.lineItemsLimitPerPage,
      (this.currentPageReceived - 1) * this.lineItemsLimitPerPage
    );
    this.getNotReceivedStockOrderLineItems(
      this.lineItemsLimitPerPage,
      (this.currentPageNotReceived - 1) * this.lineItemsLimitPerPage
    );
    if (this.isDiscrepancyLoaded) {
      this.isDiscrepancyLoaded = false;
    }
  }

  saveDamaged(lineItem: any) {
    this.updateLineItems(lineItem, {
      damagedQuantity: this.damagedQuantity,
    });
  }

  decrementDamagedQty() {
    let resultantQty = this.damagedQuantity - 1;
    if (resultantQty < 0) {
      resultantQty = 0;
    }
    this.damagedQuantity = resultantQty;
  }

  submitButton() {
    if (!this.isDiscrepancyLoaded) {
      this.getDiscrepanciesForOrder();
    } else {
      this.receiveConsignment();
    }
  }

  refreshLineItems() {
    this.getNotReceivedStockOrderLineItems();
    this.getReceivedStockOrderLineItems();
    this.getBackOrderedStockOrderLineItems();
    if (this.isDiscrepancyLoaded) {
      this.editingDamagedForItemId = undefined;
      this.getDiscrepanciesForOrder();
    }
  }
}

class box {
  public boxNumber: number;
  public boxName: string;
  public totalItems: number;
  public isOpen: boolean;
}
