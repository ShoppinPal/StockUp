import {Component, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {OrgModelApi} from "../../../shared/lb-sdk/services/custom/OrgModel";
import {ToastrService} from 'ngx-toastr';
import {Observable, combineLatest} from 'rxjs';
import {flatMap} from 'rxjs/operators';
import {UserProfileService} from "../../../shared/services/user-profile.service";
import Utils from '../../../shared/constants/utils';

@Component({
  selector: 'app-user-details',
  templateUrl: './user-details.component.html',
  styleUrls: ['./user-details.component.scss']
})
export class UserDetailsComponent implements OnInit {

  public loading = false;
  public userProfile: any;
  public user: any;
  public stores: Array<any>;

  constructor(private orgModelApi: OrgModelApi,
              private _route: ActivatedRoute,
              private _router: Router,
              private toastr: ToastrService,
              private _userProfileService: UserProfileService) {
  }

  ngOnInit() {
    this.userProfile = this._userProfileService.getProfileData();
    this._route.data.subscribe((data: any) => {
        console.log('user route data', data);
        this.user = data.user.user;
        this.stores = data.user.stores;
        for (var i = 0; i < this.user.storeModels.length; i++) {
          let storeIndex = this.stores.findIndex(x => x.objectId === this.user.storeModels[i].objectId);
          if (storeIndex !== -1)
            this.stores[storeIndex].selected = true;
        }
      },
      error => {
        console.log('error', error)
      });
  }

  inviteUser(user: any) {
    this.loading = true;
    this.orgModelApi.inviteUser(this.userProfile.orgModelId, user.id)
      .subscribe((data: any) => {
          this.loading = false;
          this.toastr.success('Sent invitation to user successfully');
          console.log('invite', data);
        },
        err => {
          this.loading = false;
          this.toastr.error('Error in sending invitation');
          console.log('invite err', err);
        });
  }

  assignStoreModels() {
    this.loading = true;
    let storeIds = [];
    for (var i = 0; i < this.stores.length; i++) {
      if (this.stores[i].selected) {
        storeIds.push(this.stores[i].objectId);
      }
    }
    this.orgModelApi.assignStoreModelsToUser(this.userProfile.orgModelId, this.user.id, storeIds)
      .subscribe((data: any) => {
        this.loading = false;
        this.toastr.success('Saved store permissions for user');
      }, err => {
        this.toastr.error('Error saving store permissions for user');
        this.loading = false;
        console.log('error', err);
      });
  }

  updateUser() {
    if (!Utils.validateEmail(this.user.email)) {
      this.toastr.error('Invalid Email');
      return;
    }
    this.loading = true;
    this.orgModelApi.updateByIdUserModels(this.userProfile.orgModelId,
      this.user.id,
      this.user
    ).subscribe(user => {
      this.loading = false;
      this.user = user;
    }, error1 => {
      this.loading = false;
      console.error(error1);
    })
  }

}
