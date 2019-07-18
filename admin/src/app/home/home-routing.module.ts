import {NgModule} from '@angular/core';
import {Routes, RouterModule} from '@angular/router';
import {SyncWithVendComponent} from './sync-with-vend/sync-with-vend.component';
import {StoresComponent} from './stores/stores.component';
import {PaymentsComponent} from './payments/payments.component';
import {UserResolverService} from './../shared/services/user-resolver.service';
import {AccessService} from "../shared/services/access.service";
import {SyncWithVendResolverService} from "./sync-with-vend/services/sync-with-vend-resolver.service";
import {WorkerSettingsComponent} from "./worker-settings/worker-settings.component";
import {WorkerSettingsResolverService} from "./worker-settings/services/worker-settings-resolver.service";
import {SuppliersComponent} from "./suppliers/suppliers.component";
import {SuppliersResolverService} from "./suppliers/services/suppliers-resolver.service";
import {ConnectComponent} from "./connect/connect.component";
import {ConnectResolverService} from "./connect/services/connect-resolver.service";
import {UsersComponent} from "./users/users.component";
import {UserManagementResolverService} from "./users/services/user-management-resolver.service";
import {StoresResolverService} from "./stores/services/stores-resolver.service";
import {ReorderPointsComponent} from "./reorder-points/reorder-points.component";
import {FileImportsComponent} from "./file-imports/file-imports.component";
import {FileImportsResolverService} from "./file-imports/services/file-imports-resolver.service";

const routes: Routes = [
  {
    path: '',
    resolve: {
      access: AccessService,
      user: UserResolverService
    },
    data: {
      title: 'Home'
    },
    children: [
      {
        path: '',
        redirectTo: '/orders/stock-orders',
        pathMatch: 'full'
      },
      {
        path: 'sync-with-vend',
        component: SyncWithVendComponent,
        data: {
          title: 'Stores'
        },
        resolve: {
          syncModels: SyncWithVendResolverService
        }
      },
      {
        path: 'connect',
        component: ConnectComponent,
        data: {
          title: 'Connect'
        },
        resolve: {
          integration: ConnectResolverService
        }
      },
      {
        path: 'users',
        loadChildren: './users/users.module#UsersModule',
        data: {
          title: 'Users'
        },
      },
      {
        path: 'worker-settings',
        component: WorkerSettingsComponent,
        data: {
          title: 'Settings > Worker Settings'
        },
        resolve: {
          workerSettings: WorkerSettingsResolverService
        }
      },
      {
        path: 'stores',
        component: StoresComponent,
        data: {
          title: 'Stores'
        },
        resolve: {
          stores: StoresResolverService
        }
      },
      {
        path: 'payments',
        component: PaymentsComponent,
        data: {
          title: 'Payments'
        }
      },
      {
        path: 'products',
        loadChildren: './products/products.module#ProductsModule',
        data: {
          title: 'Products'
        }
      },
      {
        path: 'orders',
        loadChildren: './orders/orders.module#OrdersModule',
        data: {
          title: 'Orders'
        }
      },
      {
        path: 'suppliers',
        component: SuppliersComponent,
        data: {
          title: 'Suppliers'
        },
        resolve: {
          suppliers: SuppliersResolverService
        }
      },
      {
        path: 'reorder-points',
        component: ReorderPointsComponent,
        data: {
          title: 'Settings / Reorder Points'
        }
      },
      {
        path: 'file-imports',
        component: FileImportsComponent,
        data: {
          title: 'Home > Settings > File Imports'
        },
        resolve: {
          data: FileImportsResolverService
        }
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
  providers: [
    FileImportsResolverService,
    SyncWithVendResolverService,
    ConnectResolverService,
    SuppliersResolverService,
    StoresResolverService,
    UserManagementResolverService,
    WorkerSettingsResolverService
  ]
})
export class HomeRoutingModule {
}
