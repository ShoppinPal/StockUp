import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';

import {HomeRoutingModule} from './home-routing.module';
import {HomeComponent} from './home.component';

import {StoresModule} from './stores/stores.module';
import {SharedModule} from './../shared/shared.module';
import {ConnectModule} from "./connect/connect.module";
import {ReorderPointsModule} from "./reorder-points/reorder-points.module";
import {SchedulesModule} from './schedules/schedules.module';
import {FileImportsModule} from "./file-imports/file-imports.module";


@NgModule({
  imports: [
    CommonModule,
    HomeRoutingModule,
    ConnectModule,
    FileImportsModule,
    SharedModule,
    StoresModule,
    ReorderPointsModule,
    SchedulesModule
  ],
  declarations: [HomeComponent],
  exports: [HomeComponent]
})
export class HomeModule {
}
