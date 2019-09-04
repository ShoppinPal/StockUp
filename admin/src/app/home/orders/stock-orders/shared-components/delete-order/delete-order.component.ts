import {Component, OnInit, Output, EventEmitter} from '@angular/core';
import {BsModalRef} from "ngx-bootstrap";
import {ToastrService} from "ngx-toastr";
import {OrgModelApi} from "../../../../../shared/lb-sdk/services/custom/OrgModel";
import {UserProfileService} from "../../../../../shared/services/user-profile.service";
import {Router} from "@angular/router";

@Component({
  selector: 'app-delete-order',
  templateUrl: 'delete-order.component.html',
  styleUrls: ['delete-order.component.scss']
})
export class DeleteOrderComponent implements OnInit {

  public userProfile: any;
  public orderId: any;
  public loading = false;

  constructor(public bsModalRef: BsModalRef,
              private toastr: ToastrService,
              private _userProfileService: UserProfileService,
              private orgModelApi: OrgModelApi,
              private _router: Router) {
  }

  ngOnInit() {
    this.userProfile = this._userProfileService.getProfileData();

  }

  deleteStockOrder() {
    this.loading = true;
    this.orgModelApi.deleteStockOrderVend(this.userProfile.orgModelId, this.orderId)
      .subscribe((data: any) => {
          this.toastr.success('Deleted order successfully');
          this.loading = false;
          this.bsModalRef.hide();
          this._router.navigate(['/orders/stock-orders']);
        },
        err=> {
          this.toastr.error('Could not delete order');
          this.loading = false;
          console.log('err', err);
        });
  }

}
