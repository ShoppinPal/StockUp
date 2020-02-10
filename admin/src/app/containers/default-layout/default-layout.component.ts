import {Component, OnInit, OnDestroy, Inject} from '@angular/core';
import {DOCUMENT} from '@angular/common';
import {navItems} from '../../_nav';
import {
  Router,
  ActivatedRoute,
  RouterEvent,
  NavigationStart,
  NavigationEnd,
  NavigationCancel,
  NavigationError
} from '@angular/router';
import {UserModelApi} from '../../shared/lb-sdk/services';
import {environment} from '../../../environments/environment';
import {LoopBackConfig}        from '../../shared/lb-sdk/lb.config';
import {SDKStorage} from '../../shared/lb-sdk';
import {UserProfileService} from "../../shared/services/user-profile.service";
import {animate, style, transition, trigger} from '@angular/animations';
import {SharedDataService} from '../../shared/services/shared-data.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './default-layout.component.html'
})
export class DefaultLayoutComponent implements OnDestroy {
  public navItems;
  public sidebarMinimized = true;
  private changes: MutationObserver;
  public element: HTMLElement;
  public user: any;
  public loading = false;
  public userProfile: any = this._userProfileService.getProfileData();
  private appVersion = environment.APP_VERSION;
  public isSmallDevice = false;

  constructor(private userModelApi: UserModelApi,
              private _userProfileService: UserProfileService,
              private _router: Router,
              private _route: ActivatedRoute,
              private localStorage: SDKStorage,
              private sharedDataService: SharedDataService,
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
    this.navItems = navItems.filter(item => {
      return item.roles.some(role => {
        return this.userProfile.roles.indexOf(role) !== -1;
      });
    });
    if (window.screen.width < 992) { // 992 above is desktops and laptops
      this.isSmallDevice = true;
      this.sharedDataService.setIsSmallDevice(true);
    }

  }

  ngOnDestroy(): void {
    this.changes.disconnect();
  }


  ngOnInit() {
    this.getRouteData();
    this.subscribeForRouteEvents();
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
        this._router.navigate(['/login']);
        console.log('Couldn\'t logout due to error', err);
      });
  };


  private subscribeForRouteEvents() {
    this._router.events.subscribe((event: RouterEvent) => {
      this.navigationInterceptor(event);
    })
  }

  navigationInterceptor(event: RouterEvent): void {
    if (event instanceof NavigationStart) {
      this.loading = true
    }
    if (
      event instanceof NavigationEnd ||
      event instanceof NavigationCancel ||
      event instanceof NavigationError
    ) {
      this.loading = false
    }
  }
}
