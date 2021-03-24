import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import {UserResolverService} from '../../shared/services/user-resolver.service';
import {AccessService} from '../../shared/services/access.service';
import {HistoricalOrdersComponent} from './historical-orders/historical-orders.component';
import {HistoricalOrdersResolverService} from './historical-orders/services/historical-orders-resolver.service';

const routes: Routes = [
  {
    path: '',
    resolve: {
      user: UserResolverService,
      access: AccessService
    },
    children: [
      {
        path: 'historical-orders',
        component: HistoricalOrdersComponent,
        data: {
          title: 'Historical Orders'
        },
        resolve: {
          data: HistoricalOrdersResolverService
        }
      },
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ReportingRoutingModule { }
