import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {OrdersRoutingModule} from "./orders-routing.module";
import {OrdersComponent} from './orders.component';
import {CreateOrderModule} from "./create-order/create-order.module";

@NgModule({
  imports: [
    CommonModule,
    CreateOrderModule,
    OrdersRoutingModule
  ],
  declarations: [OrdersComponent]
})
export class OrdersModule {
}
