import { NgModule } from '@angular/core';
import {Routes, RouterModule} from '@angular/router';
import {AccessService} from "../../shared/services/access.service";
import {StuckOrdersComponent} from "./stuck-orders/stuck-orders.component";
import {StuckOrdersResolverService} from "./stuck-orders/services/stuck-orders-resolver.service";

const routes: Routes = [
  {
    path: 'orders',
    resolve: {
      access: AccessService
    },
    children: [
      {
        redirectTo: 'stuck-orders',
        path: 'orders',
        pathMatch: 'full'
      },
      {
        path: 'stuck-orders',
        component: StuckOrdersComponent,
        data: {
          title: 'Home > Orders > Stuck Orders'
        }
        ,
        resolve: {
          stuckOrders: StuckOrdersResolverService
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
