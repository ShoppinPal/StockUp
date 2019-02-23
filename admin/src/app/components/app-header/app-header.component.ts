import {Component, OnInit} from '@angular/core';
import {Router, ActivatedRoute} from '@angular/router';
import {UserModelApi} from '../../shared/lb-sdk/services';
import {environment} from '../../../environments/environment';
import {LoopBackConfig}        from '../../shared/lb-sdk/lb.config';
import {SDKStorage} from '../../shared/lb-sdk';
import {UserProfileService} from "../../shared/services/user-profile.service";


@Component({
  selector: 'app-header',
  templateUrl: './app-header.component.html'
})
export class AppHeaderComponent implements OnInit {

  public user: any;
  public loading = false;

  constructor(private userModelApi: UserModelApi,
              private _userProfileService: UserProfileService,
              private _router: Router,
              private _route: ActivatedRoute,
              private localStorage: SDKStorage) {
    LoopBackConfig.setBaseURL(environment.BASE_URL);
    LoopBackConfig.setApiVersion(environment.API_VERSION);
  }


  ngOnInit() {
    this.getRouteData();
  }

  getRouteData() {
    this._route.data.subscribe((data: any) => {
        this.user = data.user;
      },
      (error) => {
        console.log('error in fetching user data', error);
      });
  }

  logout() {
    this.loading = true;
    this.userModelApi.logout().subscribe((res => {
        this._userProfileService.refreshUserProfile();
        //also logout from warehouse-v1 app
        this.localStorage.remove('$LoopBack$accessTokenId');
        this.localStorage.remove('$LoopBack$currentUserId');
        this.localStorage.remove('$LoopBack$rememberMe');

        this.loading = false;
        this._router.navigate(['/login']);
      }),
      err => {
        console.log('Couldn\'t logout due to error', err);
      });
  };

  backToOldWarehouse() {
    window.location.href = environment.BASE_URL + '/#/warehouse-landing';
  }

}
