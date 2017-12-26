import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {OrdersRoutingModule} from "./orders-routing.module";
import {StuckOrdersModule} from "./stuck-orders/stuck-orders.module";
import { OrdersComponent } from './orders.component';

@NgModule({
  imports: [
    CommonModule,
    OrdersRoutingModule,
    StuckOrdersModule
  ],
  declarations: [OrdersComponent]
})
export class OrdersModule {
}
