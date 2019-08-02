import {Component, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {OrgModelApi} from "../../shared/lb-sdk/services/custom/OrgModel";
import {ToastrService} from 'ngx-toastr';
import {Observable, combineLatest} from 'rxjs';
import {UserProfileService} from "../../shared/services/user-profile.service";
import {UserModel} from '../../shared/lb-sdk/models';

@Component({
  selector: 'app-users',
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss']
})
export class UsersComponent implements OnInit {

  constructor(private orgModelApi: OrgModelApi,
              private _route: ActivatedRoute,
              private _router: Router,
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
  public maxPageDisplay: number = 7;
  public newUserEmail: string;

  ngOnInit() {
    this.userProfile = this._userProfileService.getProfileData();
    this._route.data.subscribe((data: any) => {
        console.log('user route data', data);
        this.users = data.users.users;
        this.totalUsers = data.users.count;
      },
      error => {
        console.log('error', error)
      });
  }


  fetchUsers(limit?: number, skip?: number, searchUserText?: string) {
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
    let countFilter = {};
    if (searchUserText) {
      filter['where'] = countFilter = {
        or: [
          {
            name: {
              like: searchUserText
            }
          },
          {
            email: {
              like: searchUserText
            }
          }
        ]
      }

    }
    let fetchUsers = combineLatest(
      this.orgModelApi.getUserModels(this.userProfile.orgModelId, filter),
      this.orgModelApi.countUserModels(this.userProfile.orgModelId, countFilter));
    fetchUsers.subscribe((data: any) => {
        this.loading = false;
        this.users = data[0];
        this.totalUsers = data[1].count;
        this.currentPage = (skip / this.usersLimitPerPage) + 1;
        this.totalPages = Math.floor(this.totalUsers / 100);
      },
      err => {
        this.loading = false;
        console.log('Couldn\'t load products', err);
      });
  };

  goToUserDetailsPage(userId) {
    this.loading = true;
    this._router.navigate(['users/user-details/' + userId]);
  }

  createVirtualUser() {
    this.loading = true;
    this.orgModelApi.createUserModels(this.userProfile.orgModelId, {
      email: this.newUserEmail,
      password: Math.random().toString(36).slice(-8),
      virtual: true
    })
      .subscribe(user => {
      this.newUserEmail = '';
      this.loading = false;
      this.currentPage = 1;
      this.fetchUsers();
      this.toastr.success('Virtual user created successfully');
    }, error => {
        this.loading = false;
        console.error(error);
      this.toastr.error('Virtual user creation failed');

    })
  }
}
