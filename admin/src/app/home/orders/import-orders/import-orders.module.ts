import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ImportOrdersComponent } from './import-orders.component';
import {SharedModule} from '../../../shared/shared.module';

@NgModule({
  declarations: [ImportOrdersComponent],
  imports: [
    CommonModule,
    SharedModule,
  ]
})
export class ImportOrdersModule { }
