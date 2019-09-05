import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {OrdersRoutingModule} from "./orders-routing.module";
import {StuckOrdersModule} from "./stuck-orders/stuck-orders.module";
import { OrdersComponent } from './orders.component';
import {StockOrderDetailsModule} from "./stock-orders/stock-order-details/stock-order-details.module";
import {CreateOrderModule} from "./create-order/create-order.module";

@NgModule({
  imports: [
    CommonModule,
    CreateOrderModule,
    OrdersRoutingModule,
    StuckOrdersModule,
    StockOrderDetailsModule
  ],
  declarations: [OrdersComponent]
})
export class OrdersModule {
}
