import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {SchedulesComponent} from './schedules.component';
import {SharedModule} from '../../shared/shared.module';
import { SchedulesRoutingModule } from './schedules-routing.module';

@NgModule({
  imports: [
    CommonModule,
    SharedModule,
    SchedulesRoutingModule,
  ],
  declarations: [SchedulesComponent]
})
export class SchedulesModule {
}
