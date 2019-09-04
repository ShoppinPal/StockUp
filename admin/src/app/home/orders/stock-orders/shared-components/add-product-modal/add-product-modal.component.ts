import {Component, EventEmitter, Input, OnInit, Output, ViewChild, ViewContainerRef} from '@angular/core';
import {OrgModelApi} from '../../../../../shared/lb-sdk/services/custom';
import {ToastrService} from 'ngx-toastr';
import {UserProfileService} from '../../../../../shared/services/user-profile.service';
import {BsModalRef} from 'ngx-bootstrap';
import {constants} from '../../../../../shared/constants/constants';

@Component({
  selector: 'app-add-product-modal',
  templateUrl: './add-product-modal.component.html',
  styleUrls: ['./add-product-modal.component.scss']
})
export class AddProductModalComponent implements OnInit {
  searchProductSKUText: any;
  searchedProductsData: any[];
  userProfile;
  loading: boolean;
  @Input()order;
  @Output() modalClosed = new EventEmitter();
  constructor(
    private _userProfileService: UserProfileService,
    private orgModelApi: OrgModelApi,
    private toastr: ToastrService
  ) { }

  ngOnInit() {
    this.userProfile = this._userProfileService.getProfileData();
  }

  searchProductBySku(sku?: string) {
    this.loading = true;
    this.orgModelApi.getProductModels(this.userProfile.orgModelId, {
      limit: 10,
      where: {
        sku: {
          like: sku
        }
      }
    })
      .subscribe((data) => {
        this.searchedProductsData = data;
        this.loading = false;
      }, error => this.loading = false)
  }

  addProductToStockOrder(productModel: any) {
    if (!productModel.quantity) {
      this.toastr.error('Quantity should be greater than zero');
      return;
    }
    const {FULFILMENT_IN_PROCESS , FULFILMENT_PENDING, FULFILMENT_FAILURE,
      RECEIVING_PENDING, RECEIVING_IN_PROCESS, RECEIVING_FAILURE} = constants.REPORT_STATES;
    if ([FULFILMENT_IN_PROCESS, FULFILMENT_PENDING, FULFILMENT_FAILURE ].indexOf(this.order.state) > -1) {
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
      this.toastr.error('Cannot add product to stock order');
    })
  }

}
