import {Component, OnInit, OnDestroy, Inject} from '@angular/core';
import {DOCUMENT} from '@angular/common';
import {navItems} from '../../_nav';
import {Router, ActivatedRoute} from '@angular/router';
import {UserModelApi} from '../../shared/lb-sdk/services';
import {environment} from '../../../environments/environment';
import {LoopBackConfig}        from '../../shared/lb-sdk/lb.config';
import {SDKStorage} from '../../shared/lb-sdk';
import {UserProfileService} from "../../shared/services/user-profile.service";


@Component({
  selector: 'app-dashboard',
  templateUrl: './default-layout.component.html'
})
export class DefaultLayoutComponent implements OnDestroy {
  public navItems = navItems;
  public sidebarMinimized = true;
  private changes: MutationObserver;
  public element: HTMLElement;
  public user: any;
  public loading = false;

  constructor(private userModelApi: UserModelApi,
              private _userProfileService: UserProfileService,
              private _router: Router,
              private _route: ActivatedRoute,
              private localStorage: SDKStorage,
              @Inject(DOCUMENT) _document?: any) {

    this.changes = new MutationObserver((mutations) => {
      this.sidebarMinimized = _document.body.classList.contains('sidebar-minimized');
    });
    this.element = _document.body;
    this.changes.observe(<Element>this.element, {
      attributes: true,
      attributeFilter: ['class']
    });
    LoopBackConfig.setBaseURL(environment.BASE_URL);
    LoopBackConfig.setApiVersion(environment.API_VERSION);
  }

  ngOnDestroy(): void {
    this.changes.disconnect();
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
        this.loading = false;
        this._router.navigate(['/login']);
      }),
      err => {
        console.log('Couldn\'t logout due to error', err);
      });
  };


}
