import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {OrdersRoutingModule} from "./orders-routing.module";
import {StuckOrdersModule} from "./stuck-orders/stuck-orders.module";
import { OrdersComponent } from './orders.component';
import {StockOrdersModule} from "./stock-orders/stock-orders.module";
import {StockOrderDetailsModule} from "./stock-orders/stock-order-details/stock-order-details.module";

@NgModule({
  imports: [
    CommonModule,
    OrdersRoutingModule,
    StuckOrdersModule,
    StockOrdersModule,
    StockOrderDetailsModule
  ],
  declarations: [OrdersComponent]
})
export class OrdersModule {
}
