import { NgModule } from '@angular/core';
import {Routes, RouterModule} from '@angular/router';
import {AccessService} from "../../shared/services/access.service";
import {CreateOrderComponent} from "./create-order/create-order.component";
import {CreateOrderResolverService} from "./create-order/services/create-order-resolver.service";


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
        path: 'create-order',
        component: CreateOrderComponent,
        data: {
          title: 'Create Order'
        },
        resolve: {
          resolverData: CreateOrderResolverService
        }
      }
    ]
  }
];


@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class OrdersRoutingModule { }
