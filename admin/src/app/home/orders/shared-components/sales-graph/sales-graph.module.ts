import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SalesGraphComponent } from './sales-graph.component';
import {SharedModule} from '../../../../shared/shared.module';

@NgModule({
  declarations: [SalesGraphComponent],
  exports: [
    SalesGraphComponent
  ],
  imports: [
    CommonModule,
    SharedModule
  ]
})
export class SalesGraphModule { }
