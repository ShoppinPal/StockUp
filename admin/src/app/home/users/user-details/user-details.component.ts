import {Component, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {OrgModelApi} from '../../../shared/lb-sdk';
import {ToastrService} from 'ngx-toastr';
import {UserProfileService} from '../../../shared/services/user-profile.service';
import Utils from '../../../shared/constants/utils';

interface UserDetailsData {
  management: UserStoreTable;
  discrepancy: UserStoreTable;
}

interface UserStoreTable {
  list: Array<any>,
  currentPage: number,
  limit: number,
  searchText: string,
  skip: number
}

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

  public data: UserDetailsData = {
    management: {
      list: [],
      currentPage: 1,
      limit: 20,
      skip: 0,
      searchText: ''
    },
    discrepancy: {
      list: [],
      currentPage: 1,
      limit: 20,
      skip: 0,
      searchText: ''
    }
  }

  constructor(private orgModelApi: OrgModelApi,
              private _route: ActivatedRoute,
              private _router: Router,
              private toastr: ToastrService,
              private _userProfileService: UserProfileService) {
  }

  ngOnInit() {
    this.userProfile = this._userProfileService.getProfileData();
    this._route.data.subscribe((data: any) => {
        this.user = data.user.user;
        this.stores = data.user.stores;
        this.data.management.list = this.stores;
        this.data.discrepancy.list = this.stores;
        for (let i = 0; i < this.user.storeModels.length; i++) {
          const storeIndex = this.stores.findIndex(x => x.objectId === this.user.storeModels[i].objectId);
          if (storeIndex !== -1) {
            this.stores[storeIndex].selected = true;
          }
        }
        for (let i = 0; i < this.user.discrepancyManagerStoreModels.length; i++) {
          const storeIndex = this.stores.findIndex(x => x.objectId === this.user.discrepancyManagerStoreModels[i].objectId);
          if (storeIndex !== -1) {
            this.stores[storeIndex].selectedForDiscrepancy = true;
          }
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
    const storeIds = [];
    for (let i = 0; i < this.stores.length; i++) {
      if (this.stores[i].selected) {
        storeIds.push(this.stores[i].objectId);
      }
    }
    this.orgModelApi.assignStoreModelsToUser(this.userProfile.orgModelId, this.user.id, storeIds, "orderManager")
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
      this.toastr.success('Updated user details successfully');
      this.user = user;
    }, error1 => {
      this.loading = false;
      this.toastr.error('Error updating user details');
      console.error(error1);
    });
  }

  changePage(userStoreData: UserStoreTable, $event) {
    userStoreData.currentPage = $event.page;
    userStoreData.skip = ($event.page - 1) * userStoreData.limit;
  }

  searchStores(userStoreData: UserStoreTable) {
    userStoreData.currentPage = 1;
    userStoreData.list = this.getFilteredStores(userStoreData.searchText);
  }

  getFilteredStores(filterText) {
    return this.stores.filter(store => store.name.toLowerCase().includes(filterText.toLowerCase()))
  }

  assignStoreModelsForDiscrepancy() {
    this.loading = true;
    const storeIds = [];
    for (let i = 0; i < this.stores.length; i++) {
      if (this.stores[i].selectedForDiscrepancy) {
        storeIds.push(this.stores[i].objectId);
      }
    }
    this.orgModelApi.assignStoreModelsToUser(this.userProfile.orgModelId, this.user.id, storeIds, 'discrepancyManager')
      .subscribe((data: any) => {
        this.loading = false;
        this.toastr.success('Saved store permissions for user');
      }, err => {
        this.toastr.error('Error saving store permissions for user');
        this.loading = false;
        console.log('error', err);
      });
  }
}
