import { NgModule } from '@angular/core';
import {Routes, RouterModule} from '@angular/router';
import {AccessService} from "../../shared/services/access.service";
import {StuckOrdersComponent} from "./stuck-orders/stuck-orders.component";
import {StuckOrdersResolverService} from "./stuck-orders/services/stuck-orders-resolver.service";
import {StockOrdersComponent} from "./stock-orders/stock-orders.component";
import {StockOrdersResolverService} from "./stock-orders/services/stock-orders-resolver.service";
import {StockOrderDetailsComponent} from "./stock-orders/stock-order-details/stock-order-details.component";
import {StockOrderDetailsResolverService} from "./stock-orders/stock-order-details/services/stock-order-details-resolver.service";
import {GeneratedComponent} from "./stock-orders/generated/generated.component";
import {FulfillComponent} from "./stock-orders/fulfill/fulfill.component";
import {ReceiveComponent} from "./stock-orders/receive/receive.component";
import {ReceiveResolverService} from "./stock-orders/receive/services/receive-resolver.service";
import {FulfillResolverService} from "./stock-orders/fulfill/services/fulfill-resolver.service";
import {GeneratedResolverService} from "./stock-orders/generated/services/generated-resolver.service";

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
        path: 'stock-orders/generated/:id',
        component: GeneratedComponent,
        data: {
          title: 'Home > Orders > Stock Orders'
        },
        resolve: {
          stockOrderDetails: GeneratedResolverService
        }
      },
      {
        path: 'stock-orders/fulfill/:id',
        component: FulfillComponent,
        data: {
          title: 'Home > Orders > Stock Orders'
        },
        resolve: {
          stockOrderDetails: FulfillResolverService
        }
      },
      {
        path: 'stock-orders/receive/:id',
        component: ReceiveComponent,
        data: {
          title: 'Home > Orders > Stock Orders'
        },
        resolve: {
          stockOrderDetails: ReceiveResolverService
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
