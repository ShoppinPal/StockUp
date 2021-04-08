import {Component, EventEmitter, Input, OnInit, Output, ViewChild, ViewContainerRef} from '@angular/core';
import {ToastrService} from 'ngx-toastr';
import {Observable, combineLatest} from 'rxjs';
import {map} from 'rxjs/operators';
import {constants} from '../../../../shared/constants/constants';
import {OrgModelApi} from "../../../../shared/lb-sdk/services/custom/OrgModel";
import {UserProfileService} from "../../../../shared/services/user-profile.service";

@Component({
  selector: 'app-add-product-modal',
  templateUrl: 'add-product-modal.component.html',
  styleUrls: ['add-product-modal.component.scss']
})
export class AddProductModalComponent implements OnInit {
  searchProductSKUText: any;
  searchedProductsData: any[];
  userProfile;
  loading: boolean;
  @Input() order;
  @Output() modalClosed = new EventEmitter();

  constructor(private _userProfileService: UserProfileService,
              private orgModelApi: OrgModelApi,
              private toastr: ToastrService) {
  }

  ngOnInit() {
    this.userProfile = this._userProfileService.getProfileData();
  }

  /**
   * find the exact search match and also
   * similar sku matches
   * @param sku
   */
  searchProductBySku(sku?: string) {
    var pattern = new RegExp('.*' + sku + '.*', "i");
    /* case-insensitive RegExp search */
    var filterData = pattern.toString();
    this.loading = true;
    combineLatest(
      this.orgModelApi.getProductModels(this.userProfile.orgModelId, {
        limit: 1,
        where: {
          sku: sku
        },
        // needed to add categoryModelName field to line item
        include: 'categoryModel'
      }),
      this.orgModelApi.getProductModels(this.userProfile.orgModelId, {
        limit: 10,
        where: {
          and: [
            {
              sku: {
                "regexp": filterData
              }
            },
            // Remove exact search item to fix duplicate issue
            {
              sku: {
                neq: sku
              }
            }
          ]

        },
        // needed to add categoryModelName field to line item
        include: 'categoryModel'
      })
    ).subscribe((data: any) => {
      this.searchedProductsData = data[0].concat(data[1]);
      this.loading = false;
    }, error => this.loading = false);
  }

  addProductToStockOrder(productModel: any) {
    if (!productModel.quantity) {
      this.toastr.error('Quantity should be greater than zero');
      return;
    }
    const {
      FULFILMENT_IN_PROCESS, FULFILMENT_PENDING, FULFILMENT_FAILURE,
      RECEIVING_PENDING, RECEIVING_IN_PROCESS, RECEIVING_FAILURE
    } = constants.REPORT_STATES;
    if ([FULFILMENT_IN_PROCESS, FULFILMENT_PENDING, FULFILMENT_FAILURE].indexOf(this.order.state) > -1) {
      productModel.fulfilledQuantity = productModel.quantity;
    } else if ([RECEIVING_PENDING, RECEIVING_IN_PROCESS, RECEIVING_FAILURE].indexOf(this.order.state) > -1) {
      productModel.receivedQuantity = productModel.quantity;
      productModel.fulfilled = true;
    } else {
      productModel.orderQuantity = productModel.quantity;
    }
    this.loading = true;
    this.orgModelApi.addProductToStockOrder(
      this.userProfile.orgModelId,
      this.order.id,
      this.order.storeModelId,
      productModel
    ).subscribe(result => {
      this.loading = false;
      this.toastr.success('Added product to stock order');
    }, error => {
      this.loading = false;
      // this.toastr.error('Cannot add product to stock order');
      this.toastr.error('Product already exists in stock order');
    })
  }

}
