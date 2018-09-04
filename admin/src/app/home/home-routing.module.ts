import {NgModule} from '@angular/core';
import {Routes, RouterModule} from '@angular/router';
import {SyncWithVendComponent} from './sync-with-vend/sync-with-vend.component';
import {StoresComponent} from './stores/stores.component';
import {PaymentsComponent} from './payments/payments.component';
import {ProductsComponent} from './products/products.component';
import {UserResolverService} from './../shared/services/user-resolver.service';
import {AccessService} from "../shared/services/access.service";
import {SyncWithVendResolverService} from "./sync-with-vend/services/sync-with-vend-resolver.service";
import {OrdersComponent} from "./orders/orders.component";
import {WorkerSettingsComponent} from "./worker-settings/worker-settings.component";
import {WorkerSettingsResolverService} from "./worker-settings/services/worker-settings-resolver.service";
import {SuppliersComponent} from "./suppliers/suppliers.component";
import {SuppliersResolverService} from "./suppliers/services/suppliers-resolver.service";
import {ConnectComponent} from "./connect/connect.component";

const routes: Routes = [
  {
    path: '',
    resolve: {
      user: UserResolverService,
      access: AccessService
    },
    children: [
      {
        path: '',
        redirectTo: '/products/bin-locations',
        pathMatch: 'full'
      },
      {
        path: 'sync-with-vend',
        component: SyncWithVendComponent,
        data: {
          title: 'Home > Stores'
        },
        resolve: {
          syncModels: SyncWithVendResolverService
        }
      },
      {
        path: 'connect',
        component: ConnectComponent,
        data: {
          title: 'Home > Connect'
        },
        resolve: {
          user: UserResolverService
        }
      },
      {
        path: 'worker-settings',
        component: WorkerSettingsComponent,
        data: {
          title: 'Home > Settings > Worker Settings'
        },
        resolve: {
          workerSettings: WorkerSettingsResolverService
        }
      },
      {
        path: 'stores',
        component: StoresComponent,
        data: {
          title: 'Home > Stores'
        }
      },
      {
        path: 'payments',
        component: PaymentsComponent,
        data: {
          title: 'Home > Payments'
        }
      },
      {
        path: 'products',
        component: ProductsComponent,
        data: {
          title: 'Home > Products'
        }
      },
      {
        path: 'orders',
        component: OrdersComponent,
        data: {
          title: 'Home > Orders'
        }
      },
      {
        path: 'suppliers',
        component: SuppliersComponent,
        data: {
          title: 'Home > Suppliers'
        },
        resolve: {
          suppliers: SuppliersResolverService
        }
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
  providers: [SyncWithVendResolverService, SuppliersResolverService, WorkerSettingsResolverService]
})
export class HomeRoutingModule {
}
