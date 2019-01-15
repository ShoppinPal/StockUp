import { NgModule } from '@angular/core';
import {Routes, RouterModule} from '@angular/router';
import {AccessService} from "../../shared/services/access.service";
import {StuckOrdersComponent} from "./stuck-orders/stuck-orders.component";
import {StuckOrdersResolverService} from "./stuck-orders/services/stuck-orders-resolver.service";
import {StockOrdersComponent} from "./stock-orders/stock-orders.component";
import {StockOrdersResolverService} from "./stock-orders/services/stock-orders-resolver.service";
import {StockOrderDetailsComponent} from "./stock-orders/stock-order-details/stock-order-details.component";
import {StockOrderDetailsResolverService} from "./stock-orders/stock-order-details/services/stock-order-details-resolver.service";

const routes: Routes = [
  {
    path: 'orders',
    resolve: {
      access: AccessService
    },
    children: [
      {
        redirectTo: 'stock-orders',
        path: 'orders',
        pathMatch: 'full'
      },
      {
        path: 'stock-orders',
        component: StockOrdersComponent,
        data: {
          title: 'Home > Orders > Stock Orders'
        }
        ,
        resolve: {
          stockOrders: StockOrdersResolverService
        }
      },
      {
        path: 'stock-orders/:id',
        component: StockOrderDetailsComponent,
        data: {
          title: 'Home > Orders > Stock Orders'
        }
        ,
        resolve: {
          stockOrderDetails: StockOrderDetailsResolverService
        }
      },
      {
        path: 'stuck-orders',
        component: StuckOrdersComponent,
        data: {
          title: 'Home > Orders > Stuck Orders'
        }
        // ,
        // resolve: {
        //   stuckOrders: StuckOrdersResolverService
        // }
      }
    ]
  }
];


@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class OrdersRoutingModule { }
