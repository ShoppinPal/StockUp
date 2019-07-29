import { NgModule } from '@angular/core';
import {Routes, RouterModule} from '@angular/router';
import {AccessService} from "../../shared/services/access.service";
import {StuckOrdersComponent} from "./stuck-orders/stuck-orders.component";
import {StockOrdersResolverService} from "./stock-orders/services/stock-orders-resolver.service";


const routes: Routes = [
  {
    path: '',
    resolve: {
      access: AccessService
    },
    children: [
      {
        redirectTo: 'stock-orders',
        path: '',
        pathMatch: 'full'
      },
      {
        path: 'stock-orders',
        loadChildren: './stock-orders/stock-orders.module#StockOrdersModule',
        data: {
          title: 'Stock Orders'
        }
      },
      {
        path: 'stuck-orders',
        component: StuckOrdersComponent,
        data: {
          title: 'Stuck Orders'
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
