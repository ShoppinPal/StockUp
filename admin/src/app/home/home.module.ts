import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';

import {HomeRoutingModule} from './home-routing.module';
import {HomeComponent} from './home.component';

import {SyncWithVendModule} from './sync-with-vend/sync-with-vend.module';
import {WorkerSettingsModule} from './worker-settings/worker-settings.module';
import {StoresModule} from './stores/stores.module';
import {PaymentsModule} from './payments/payments.module';
import {SharedModule} from './../shared/shared.module';
import {SuppliersModule} from "./suppliers/suppliers.module";
import {ConnectModule} from "./connect/connect.module";
import {ReorderPointsModule} from "./reorder-points/reorder-points.module";
import {FileImportsModule} from "./file-imports/file-imports.module";


@NgModule({
  imports: [
    CommonModule,
    HomeRoutingModule,
    SyncWithVendModule,
    ConnectModule,
    FileImportsModule,
    SharedModule,
    StoresModule,
    SuppliersModule,
    PaymentsModule,
    ReorderPointsModule,
    WorkerSettingsModule
  ],
  declarations: [HomeComponent],
  exports: [HomeComponent]
})
export class HomeModule {
}
