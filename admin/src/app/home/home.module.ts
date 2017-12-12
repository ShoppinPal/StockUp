import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';

import {HomeRoutingModule} from './home-routing.module';
import {HomeComponent} from './home.component';

import {SyncWithVendModule} from './sync-with-vend/sync-with-vend.module';
import {StoresModule} from './stores/stores.module';
import {PaymentsModule} from './payments/payments.module';
import {ProductsModule} from './products/products.module';
import {SharedModule} from './../shared/shared.module';


@NgModule({
  imports: [
    CommonModule,
    HomeRoutingModule,
    SyncWithVendModule,
    SharedModule,
    StoresModule,
    PaymentsModule,
    ProductsModule
  ],
  declarations: [HomeComponent],
  exports: [HomeComponent]
})
export class HomeModule {
}
