import {Component, OnInit} from '@angular/core';
import {OrgModelApi} from "../../../../shared/lb-sdk/services/custom/OrgModel";
import {ActivatedRoute, Router} from '@angular/router';
import {Observable, combineLatest} from 'rxjs';
import {ToastrService} from 'ngx-toastr';
import {UserProfileService} from "../../../../shared/services/user-profile.service";
import {LoopBackAuth} from "../../../../shared/lb-sdk/services/core/auth.service";
import {constants} from "../../../../shared/constants/constants";
import {DatePipe} from '@angular/common';

@Component({
  selector: 'app-receive',
  templateUrl: './receive.component.html',
  styleUrls: ['./receive.component.scss']
})
export class ReceiveComponent implements OnInit {

  public userProfile: any;
  public loading = false;
  public filter: any = {};
  public order: any = {};
  public receivedLineItems: Array<any>;
  public notReceivedLineItems: Array<any>;
  public totalReceivedLineItems: number;
  public totalNotReceivedLineItems: number;
  public maxPageDisplay: number = 7;
  public searchSKUText: string = '';
  public totalPages: number;
  public currentPageReceived: number = 1;
  public currentPageNotReceived: number = 1;
  public lineItemsLimitPerPage: number = 100;
  public creatingTransferOrder: boolean = false;
  public creatingPurchaseOrderVend: boolean = false;
  public reportStates: any = constants.REPORT_STATES;
  public isWarehouser: boolean = false;
  public editable: boolean;
  public searchSKUFocused: boolean = true;
  public enableBarcode: boolean = true;

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
        this.getNotReceivedStockOrderLineItems();
        this.getReceivedStockOrderLineItems();
      },
      error => {
        console.log('error', error)
      });

    //update order to state "Approval in Process" from "Generated"
    if (this.order.state === constants.REPORT_STATES.RECEIVING_PENDING) {
      this.orgModelApi.updateByIdReportModels(this.userProfile.orgModelId, this.order.id, {
        state: constants.REPORT_STATES.RECEIVING_IN_PROCESS
      })
        .subscribe((data: any) => {
          console.log('updated report state to receiving in process', data);
        });
    }

    if (this.order.state === constants.REPORT_STATES.RECEIVING_PENDING ||
      this.order.state === constants.REPORT_STATES.RECEIVING_IN_PROCESS ||
      this.order.state === constants.REPORT_STATES.RECEIVING_FAILURE) {
      this.editable = true;
    }

  }

  getReceivedStockOrderLineItems(limit?: number, skip?: number, productModelId?: string) {

    if (!(limit && skip)) {
      limit = 100;
      skip = 0;
    }
    if (!productModelId){
      this.searchSKUText = ''
    }
    let filter = {
      where: {
        reportModelId: this.order.id,
        approved: true,
        fulfilled: true,
        received: true,
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
      approved: true,
      fulfilled: true,
      received: true
    };
    if (productModelId)
      countFilter['productModelId'] = productModelId;
    this.loading = true;
    let fetchLineItems = combineLatest(
      this.orgModelApi.getStockOrderLineitemModels(this.userProfile.orgModelId, filter),
      this.orgModelApi.countStockOrderLineitemModels(this.userProfile.orgModelId, countFilter));
    fetchLineItems.subscribe((data: any) => {
        this.currentPageReceived = (skip / this.lineItemsLimitPerPage) + 1;
        this.totalReceivedLineItems = data[1].count;
        this.checkScanModeAndIncrement(data, false);
        this.receivedLineItems = data[0];
        if (!this.enableBarcode || !this.searchSKUText) {
          this.loading = false;
        }
      },
      err => {
        this.loading = false;
        console.log('error', err);
      });
  }

  getNotReceivedStockOrderLineItems(limit?: number, skip?: number, productModelId?: string) {
    if (!(limit && skip)) {
      limit = 100;
      skip = 0;
    }
    if (!productModelId){
      this.searchSKUText = ''
    }
    let filter = {
      where: {
        reportModelId: this.order.id,
        approved: true,
        fulfilled: true,
        received: false,
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
      approved: true,
      fulfilled: true,
      received: false
    };
    if (productModelId)
      countFilter['productModelId'] = productModelId;
    this.loading = true;
    let fetchLineItems = combineLatest(
      this.orgModelApi.getStockOrderLineitemModels(this.userProfile.orgModelId, filter),
      this.orgModelApi.countStockOrderLineitemModels(this.userProfile.orgModelId, countFilter));
    fetchLineItems.subscribe((data: any) => {
        this.currentPageNotReceived = (skip / this.lineItemsLimitPerPage) + 1;
        this.totalNotReceivedLineItems = data[1].count;
        for (var i = 0; i < data[0].length; i++) {
          // Prefill value if  Manual mode && Nothing has been recieved yet
          if (!this.enableBarcode && data[0][i].receivedQuantity === 0) {
            data[0][i].receivedQuantity = data[0][i].fulfilledQuantity;
          }
        }
          this.checkScanModeAndIncrement(data, true);
          this.notReceivedLineItems = data[0];
        if (!this.enableBarcode || !this.searchSKUText) {
          this.loading = false;
        }
        },
      err => {
        this.loading = false;
        console.log('error', err);
      });
  }
  checkScanModeAndIncrement(data: any, itemNotRecieved) {
    if (this.enableBarcode && data[0].length > 0 && this.searchSKUText === data[0][0].productModel.sku){
      data[0][0].receivedQuantity++;
      this.updateLineItems(data[0][0], {
        receivedQuantity: data[0][0].receivedQuantity,
        received: true
      }, itemNotRecieved);
    }
  }
  searchProductBySku(sku?: string) {
    this.loading = true;
    this.orgModelApi.getProductModels(this.userProfile.orgModelId, {
      where: {
          sku: sku
      }
    }).subscribe((data: any) => {
      if (data.length === 1) {
        this.getReceivedStockOrderLineItems(1, 0, data[0].id);
        this.getNotReceivedStockOrderLineItems(1, 0, data[0].id);
      }
      else {
        this.loading = false;
        this.currentPageNotReceived = 1;
        this.totalNotReceivedLineItems = 0;
        this.notReceivedLineItems = [];
        this.receivedLineItems = [];
        this.totalReceivedLineItems = 0;
        this.currentPageReceived = 1;
      }
    })
  }

  updateLineItems(lineItems, data: any, refresh = true) {
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
        if (refresh) {
          this.getReceivedStockOrderLineItems();
          this.getNotReceivedStockOrderLineItems();
        } else {
          this.loading = false;
        }
          console.log('approved', res);
          this.loading = false;
          this.toastr.success('Row Updated');
          },
        err => {
          this.toastr.error('Error Updating Row');
          console.log('err', err);
          this.loading = false;
        });
  }

  receiveItem(lineItem) {
    this.updateLineItems(lineItem, {
      received: true,
      receivedQuantity: lineItem.receivedQuantity
    });
  }

  removeItem(lineItem) {
    this.updateLineItems(lineItem, {received: false});
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
            this.getNotReceivedStockOrderLineItems();
            this.getReceivedStockOrderLineItems();
          }
          this.loading = false;
        },
        err => {
          this.loading = false;
          this.toastr.error('Error updating order state, please refresh');
        });
  };

  receiveConsignment() {
    if (!this.totalReceivedLineItems) {
      this.toastr.error('Please receive at least one item to send order to supplier');
    }
    else {
      // this.creatingPurchaseOrderVend = true;
      let componentScope = this;
      let EventSource = window['EventSource'];
      let es = new EventSource('/api/OrgModels/' + this.userProfile.orgModelId + '/receiveConsignment?access_token=' + this.auth.getAccessTokenId() + '&reportModelId=' + this.order.id + '&type=json');
      this.toastr.info('Receiving consignment...');
      this._router.navigate(['/orders/stock-orders']);
      es.onmessage = function (event) {
        let response = JSON.parse(event.data);
        console.log(response);
        if (response.success) {
          componentScope.toastr.success('Order received successfully');
        }
        else {
          componentScope.creatingPurchaseOrderVend = false;
          componentScope.toastr.error('Error in receiving order');
        }
        es.close();
      };
    }
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
    this.getNotReceivedStockOrderLineItems();
    this.searchSKUText = ''
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
   * @param searchText
   */
  barcodeSearchSKU($event) {
    if (this.enableBarcode && this.searchSKUText !== '') {
      this.searchProductBySku(this.searchSKUText);
      $event.target.select();
    }
  }
}

class box {
  public boxNumber: number;
  public boxName: string;
  public totalItems: number;
  public isOpen: boolean;
}
