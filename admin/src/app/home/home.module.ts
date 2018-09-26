import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';

import {HomeRoutingModule} from './home-routing.module';
import {HomeComponent} from './home.component';

import {SyncWithVendModule} from './sync-with-vend/sync-with-vend.module';
import {WorkerSettingsModule} from './worker-settings/worker-settings.module';
import {StoresModule} from './stores/stores.module';
import {PaymentsModule} from './payments/payments.module';
import {ProductsModule} from './products/products.module';
import {SharedModule} from './../shared/shared.module';
import {OrdersModule} from "./orders/orders.module";
import {SuppliersModule} from "./suppliers/suppliers.module";
import {ConnectModule} from "./connect/connect.module";
import {UsersModule} from "./users/users.module";


@NgModule({
  imports: [
    CommonModule,
    HomeRoutingModule,
    SyncWithVendModule,
    ConnectModule,
    SharedModule,
    StoresModule,
    SuppliersModule,
    PaymentsModule,
    ProductsModule,
    OrdersModule,
    UsersModule,
    WorkerSettingsModule
  ],
  declarations: [HomeComponent],
  exports: [HomeComponent]
})
export class HomeModule {
}
