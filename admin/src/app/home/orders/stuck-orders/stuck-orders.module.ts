import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StuckOrdersComponent } from './stuck-orders.component';
import {StuckOrdersResolverService} from "./services/stuck-orders-resolver.service";
import {LoadingModule} from 'ngx-loading';
import {NgxPaginationModule} from 'ngx-pagination';
import {FormsModule} from '@angular/forms';
import {StockOrdersResolverService} from "../stock-orders/services/stock-orders-resolver.service";

@NgModule({
  imports: [
    CommonModule,
    LoadingModule,
    NgxPaginationModule,
    FormsModule
  ],
  declarations: [StuckOrdersComponent],
  providers: [StuckOrdersResolverService, StockOrdersResolverService]
})
export class StuckOrdersModule { }
