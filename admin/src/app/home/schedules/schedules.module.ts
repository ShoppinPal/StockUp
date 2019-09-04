import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {SchedulesComponent} from './schedules.component';
import {SharedModule} from '../../shared/shared.module';

@NgModule({
  imports: [
    CommonModule,
    SharedModule,
  ],
  declarations: [SchedulesComponent]
})
export class SchedulesModule {
}
