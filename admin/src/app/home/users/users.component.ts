import {Component, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {OrgModelApi} from "../../shared/lb-sdk/services/custom/OrgModel";
import {ToastrService} from 'ngx-toastr';
import {Observable} from 'rxjs';
import {UserProfileService} from "../../shared/services/user-profile.service";

@Component({
  selector: 'app-users',
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss']
})
export class UsersComponent implements OnInit {

  constructor(private orgModelApi: OrgModelApi,
              private _route: ActivatedRoute,
              private toastr: ToastrService,
              private _userProfileService: UserProfileService) {
  }

  public loading = false;
  public userProfile: any;
  public users: Array<any>;
  public totalUsers: number;
  public totalPages: number;
  public usersLimitPerPage: number = 10;
  public currentPage: number = 1;
  public searchUserText: string;
  public foundUser: boolean = false;
  public searchedUser: Array<any>;

  ngOnInit() {
    this.userProfile = this._userProfileService.getProfileData();
    this._route.data.subscribe((data: any) => {
      console.log('user route data', data);
        this.users = data.users.users;
        this.totalUsers = data.users.count;
        this.totalPages = this.totalUsers / this.usersLimitPerPage;
      },
      error => {
        console.log('error', error)
      });
  }

  fetchUsers(limit?: number, skip?: number) {
    if (!(limit && skip)) {
      this.searchUserText = '';
    }
    this.foundUser = false;
    this.searchedUser = null;
    this.loading = true;
    let filter = {
      limit: limit || 10,
      skip: skip || 0
    };
    let fetchUsers = Observable.combineLatest(
      this.orgModelApi.getUserModels(this.userProfile.orgModelId, filter),
      this.orgModelApi.countUserModels(this.userProfile.orgModelId));
    fetchUsers.subscribe((data: any) => {
        this.loading = false;
        this.users = data[0];
        this.totalUsers = data[1].count;

        this.totalPages = Math.floor(this.totalUsers / 100);
      },
      err => {
        this.loading = false;
        console.log('Couldn\'t load products', err);
      });
  };

}
