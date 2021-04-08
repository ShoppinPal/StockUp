import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HistoricalOrdersComponent } from './historical-orders.component';
import {SharedModule} from '../../../shared/shared.module';

@NgModule({
  declarations: [HistoricalOrdersComponent],
  imports: [
    CommonModule,
    SharedModule
  ]
})
export class HistoricalOrdersModule { }
