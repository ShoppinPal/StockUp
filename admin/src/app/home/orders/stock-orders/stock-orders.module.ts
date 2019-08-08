import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StockOrdersComponent } from './stock-orders.component';
import {SharedModule} from '../../../shared/shared.module';
import {FulfillModule} from "./fulfill/fulfill.module";
import {GeneratedModule} from "./generated/generated.module";
import {ReceiveModule} from "./receive/receive.module";
import {CompleteModule} from "./complete/complete.module";
import {StockOrdersRoutingModule} from './stock-orders-routing.module';
import { CreateStockOrderComponent } from './create-stock-order/create-stock-order.component';
import {CreateStockOrderResolverService} from './create-stock-order/services/create-stock-order-resolver.service';

@NgModule({
  imports: [
    CommonModule,
    StockOrdersRoutingModule,
    CompleteModule,
    SharedModule,
    FulfillModule,
    GeneratedModule,
    ReceiveModule
  ],
  declarations: [StockOrdersComponent, CreateStockOrderComponent],
  providers: [CreateStockOrderResolverService]
})
export class StockOrdersModule { }
