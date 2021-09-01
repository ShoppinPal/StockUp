import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {OrdersRoutingModule} from './orders-routing.module';
import {OrdersComponent} from './orders.component';
import {CreateOrderModule} from './create-order/create-order.module';
import {ImportOrdersModule} from './import-orders/import-orders.module';

@NgModule({
  imports: [
    CommonModule,
    CreateOrderModule,
    OrdersRoutingModule,
    ImportOrdersModule
  ],
  declarations: [OrdersComponent]
})
export class OrdersModule {
}
