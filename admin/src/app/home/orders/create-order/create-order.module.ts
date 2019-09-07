import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CreateOrderComponent } from './create-order.component';
import {SharedModule} from "../../../shared/shared.module";
import {SchedulePickerModule} from "../shared-components/schedule-picker/schedule-picker.module";

@NgModule({
  declarations: [CreateOrderComponent],
  imports: [
    CommonModule,
    SharedModule,
    SchedulePickerModule
  ]
})
export class CreateOrderModule { }
