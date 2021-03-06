import {BrowserModule} from '@angular/platform-browser';
import {NgModule} from '@angular/core';
import {LocationStrategy, HashLocationStrategy} from '@angular/common';

import {PerfectScrollbarModule} from 'ngx-perfect-scrollbar';
import {PERFECT_SCROLLBAR_CONFIG} from 'ngx-perfect-scrollbar';
import {PerfectScrollbarConfigInterface} from 'ngx-perfect-scrollbar';

const DEFAULT_PERFECT_SCROLLBAR_CONFIG: PerfectScrollbarConfigInterface = {
  suppressScrollX: true
};

// Import containers
import {
  DefaultLayoutComponent,
} from './containers';


const APP_CONTAINERS = [
  DefaultLayoutComponent
];

import {
  AppAsideModule,
  AppBreadcrumbModule,
  AppHeaderModule,
  AppFooterModule,
  AppSidebarModule,
} from '@coreui/angular';

// Import components
import {AppComponent} from './app.component';

// Import routing module
import {AppRoutingModule} from './app.routing';

// Import 3rd party components
import {BsDropdownModule} from 'ngx-bootstrap/dropdown';
import {TypeaheadModule, PaginationModule} from 'ngx-bootstrap';
import {FormsModule,ReactiveFormsModule} from '@angular/forms';
import {LoadingModule, ANIMATION_TYPES} from 'ngx-loading';
import {SDKBrowserModule} from './shared/lb-sdk/index';
import {SharedModule} from './shared/shared.module';
import {TabsModule} from 'ngx-bootstrap/tabs';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {ToastrModule} from 'ngx-toastr';


@NgModule({
  imports: [
    AppRoutingModule,
    AppAsideModule,
    AppBreadcrumbModule.forRoot(),
    AppFooterModule,
    AppHeaderModule,
    AppSidebarModule,
    PerfectScrollbarModule,
    BrowserAnimationsModule,
    BrowserModule,
    BsDropdownModule.forRoot(),
    FormsModule,
    ReactiveFormsModule,
    LoadingModule.forRoot({
      animationType: ANIMATION_TYPES.threeBounce,
      backdropBackgroundColour: '#00000096',
      backdropBorderRadius: '4px',
      primaryColour: '#20a8d8',
      fullScreenBackdrop: true,
      secondaryColour: '#20a8d89c',
      tertiaryColour: '#ffffff'
    }),
    PaginationModule.forRoot(),
    SDKBrowserModule.forRoot(),
    SharedModule.forRoot(),
    TabsModule.forRoot(),
    ToastrModule.forRoot(),
    TypeaheadModule.forRoot()
  ],
  declarations: [
    AppComponent,
    ...APP_CONTAINERS
  ],
  exports: [],
  providers: [{
    provide: LocationStrategy,
    useClass: HashLocationStrategy
  }],
  bootstrap: [AppComponent]
})
export class AppModule {
}
