import {BrowserModule} from '@angular/platform-browser';
import {NgModule} from '@angular/core';
import {LocationStrategy, HashLocationStrategy} from '@angular/common';

import {AppComponent} from './app.component';

// Import containers
import {
  FullLayoutComponent,
  SimpleLayoutComponent
} from './containers';


const APP_CONTAINERS = [
  FullLayoutComponent,
  SimpleLayoutComponent
];

// Import components
import {
  AppBreadcrumbsComponent,
  AppFooterComponent,
  AppHeaderComponent,
  AppSidebarComponent,
  AppSidebarFooterComponent,
  AppSidebarFormComponent,
  AppSidebarHeaderComponent,
  AppSidebarMinimizerComponent,
  APP_SIDEBAR_NAV
} from './components';

const APP_COMPONENTS = [
  AppBreadcrumbsComponent,
  AppFooterComponent,
  AppHeaderComponent,
  AppSidebarComponent,
  AppSidebarFooterComponent,
  AppSidebarFormComponent,
  AppSidebarHeaderComponent,
  AppSidebarMinimizerComponent,
  APP_SIDEBAR_NAV
]

// Import routing module
import {AppRoutingModule} from './app.routing';

// Import 3rd party components
import {BsDropdownModule} from 'ngx-bootstrap/dropdown';
import {ChartsModule} from 'ng2-charts/ng2-charts';
import {FormsModule} from '@angular/forms';
import {LoadingModule, ANIMATION_TYPES} from 'ngx-loading';
import {SDKBrowserModule} from './shared/lb-sdk/index';
import {SharedModule} from './shared/shared.module';
import {TabsModule} from 'ngx-bootstrap/tabs';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ToastrModule } from 'ngx-toastr';

@NgModule({
  imports: [
    AppRoutingModule,
    BrowserAnimationsModule,
    BrowserModule,
    BsDropdownModule.forRoot(),
    ChartsModule,
    FormsModule,
    LoadingModule.forRoot({
      animationType: ANIMATION_TYPES.threeBounce,
      backdropBackgroundColour: '#00000096',
      backdropBorderRadius: '4px',
      primaryColour: '#20a8d8',
      fullScreenBackdrop: true,
      secondaryColour: '#20a8d89c',
      tertiaryColour: '#ffffff'
    }),
    SDKBrowserModule.forRoot(),
    SharedModule.forRoot(),
    TabsModule.forRoot(),
    ToastrModule.forRoot()
  ],
  declarations: [
    AppComponent,
    ...APP_CONTAINERS,
    ...APP_COMPONENTS,
    FullLayoutComponent
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
