import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StockOrdersComponent } from './stock-orders.component';
import {LoadingModule} from 'ngx-loading';
import {NgxPaginationModule} from 'ngx-pagination';
import {FormsModule} from '@angular/forms';
import {SharedModule} from '../../../shared/shared.module';

@NgModule({
  imports: [
    CommonModule,
    LoadingModule,
    FormsModule,
    NgxPaginationModule,
    SharedModule
  ],
  declarations: [StockOrdersComponent]
})
export class StockOrdersModule { }
