import {Component, OnInit, Output, EventEmitter} from '@angular/core';
import {BsModalRef} from "ngx-bootstrap";
import {ToastrService} from "ngx-toastr";
import {OrgModelApi} from "../../../../shared/lb-sdk/services/custom/OrgModel";
import {UserProfileService} from "../../../../shared/services/user-profile.service";
import {Router} from "@angular/router";

@Component({
  selector: 'app-delete-user',
  templateUrl: 'delete-user.component.html',
  styleUrls: ['delete-user.component.scss']
})
export class DeleteUserComponent implements OnInit {

  public userProfile: any;
  public userId: any;
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

  deleteUserFromStockUp() {
    this.loading = true;
    this.orgModelApi.deleteUser(this.userProfile.orgModelId, this.userId)
      .subscribe((data: any) => {
          this.toastr.success('Deleted user successfully');
          this.loading = false;
          this.bsModalRef.hide();
          // this._router.navigate(['/orders/stock-orders']);
        },
        err=> {
          this.toastr.error('Could not delete user');
          this.loading = false;
          console.log('err', err);
        });
  }

}
