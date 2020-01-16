import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import {SharedModule} from '../../../../shared/shared.module';
import {SchedulePickerComponent} from "./schedule-picker.component";


@NgModule({
  imports: [
    CommonModule,
    SharedModule
  ],
  declarations: [SchedulePickerComponent],
  exports: [
    SchedulePickerComponent
  ]
})
export class SchedulePickerModule { }
