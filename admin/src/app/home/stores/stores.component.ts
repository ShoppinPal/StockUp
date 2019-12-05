import {Component, OnInit, ChangeDetectorRef} from '@angular/core';
import {OrgModelApi} from "../../shared/lb-sdk/services/custom/OrgModel";
import {UserProfileService} from "../../shared/services/user-profile.service";
import {ActivatedRoute, Router} from '@angular/router';
import {Observable} from 'rxjs';
import {ToastrService} from 'ngx-toastr';

@Component({
  selector: 'app-stores',
  templateUrl: 'stores.component.html',
  styleUrls: ['stores.component.scss']
})
export class StoresComponent implements OnInit {

  public userProfile: any;
  public loading = false;
  public filter: any = {};
  public stores: Array<any>;
  public storeName: string;

  constructor(private orgModelApi: OrgModelApi,
              private _route: ActivatedRoute,
              private _router: Router,
              private toastr: ToastrService,
              private cdRef: ChangeDetectorRef,
              private _userProfileService: UserProfileService) {
  }

  ngOnInit() {
    this.userProfile = this._userProfileService.getProfileData();
    this._route.data.subscribe((data: any) => {
        this.stores = data.stores;
      },
      error => {
        console.log('error', error)
      });
  }

  updateStore(store) {
    this.loading = true;
    this.orgModelApi.updateByIdStoreModels(this.userProfile.orgModelId, store.objectId, store)
      .subscribe((data: any) => {
          console.log('updated', data);
          this.loading = false;
          this.toastr.success('Updated store details successfully');
        },
        err => {
          console.log('error', err);
          this.loading = false;
          this.toastr.error('Error updating store details');
        });
  }

  createVirtualStore() {
    this.loading = true;
    this.orgModelApi.createStoreModels(this.userProfile.orgModelId, {
      name: this.storeName,
      storeNumber: 'Virtual Store'
    })
      .subscribe((data: any) => {
        this.loading = false;
        this.toastr.success('Created store successfully');
        this.fetchStores();
        this.storeName = '';
      }, err => {
        this.loading = false;
        this.toastr.error('Could not create store');
        console.log(err);
      });
  }

  fetchStores() {
    this.loading = true;
    this.orgModelApi.getStoreModels(this.userProfile.orgModelId)
      .subscribe((data: any) => {
          this.loading = false;
          this.stores = data;
        },
        err => {
          this.toastr.error('Error fetching stores');
          this.loading = false;
          console.log(err);
        })
  }

}
