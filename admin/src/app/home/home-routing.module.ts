import {NgModule} from '@angular/core';
import {Routes, RouterModule} from '@angular/router';
import {StoresComponent} from './stores/stores.component';
import {UserResolverService} from './../shared/services/user-resolver.service';
import {AccessService} from "../shared/services/access.service";
import {SuppliersResolverService} from "./suppliers/services/suppliers-resolver.service";
import {ConnectComponent} from "./connect/connect.component";
import {ConnectResolverService} from "./connect/services/connect-resolver.service";
import {UserManagementResolverService} from "./users/services/user-management-resolver.service";
import {StoresResolverService} from "./stores/services/stores-resolver.service";
import {ReorderPointsComponent} from "./reorder-points/reorder-points.component";
import {FileImportsComponent} from "./file-imports/file-imports.component";
import {FileImportsResolverService} from "./file-imports/services/file-imports-resolver.service";
import {SchedulesComponent} from "./schedules/schedules.component";

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
        data: {
          title: 'Suppliers'
        },
        loadChildren: './suppliers/suppliers.module#SuppliersModule'
      },
      {
        path: 'reorder-points',
        component: ReorderPointsComponent,
        data: {
          title: 'Settings  /  Reorder Points'
        }
      },
      {
        path: 'file-imports',
        component: FileImportsComponent,
        data: {
          title: 'Settings  /  File Imports'
        },
        resolve: {
          data: FileImportsResolverService
        }
      },
      {
        path: 'schedules',
        component: SchedulesComponent,
        data: {
          title: 'Settings  /  Schedules'
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
    ConnectResolverService,
    SuppliersResolverService,
    StoresResolverService,
    UserManagementResolverService
  ]
})
export class HomeRoutingModule {
}
