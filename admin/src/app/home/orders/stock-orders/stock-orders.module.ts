import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StockOrdersComponent } from './stock-orders.component';
import {LoadingModule} from 'ngx-loading';
import {FormsModule} from '@angular/forms';
import {SharedModule} from '../../../shared/shared.module';
import {PaginationModule} from 'ngx-bootstrap';

@NgModule({
  imports: [
    CommonModule,
    LoadingModule,
    FormsModule,
    PaginationModule,
    SharedModule
  ],
  declarations: [StockOrdersComponent]
})
export class StockOrdersModule { }
