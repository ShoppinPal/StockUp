import {NgModule} from '@angular/core';
import {Routes, RouterModule} from '@angular/router';
import {BinLocationsComponent} from './bin-locations/bin-locations.component';
import {UserResolverService} from './../../shared/services/user-resolver.service';
import {AccessService} from "../../shared/services/access.service";
import {BinLocationsResolverService} from "./bin-locations/services/bin-locations-resolver.service";

const routes: Routes = [
  {
    path: 'products',
    resolve: {
      user: UserResolverService,
      access: AccessService
    },
    children: [
      {
        redirectTo: 'bin-locations',
        path: 'products',
        pathMatch: 'full'
      },
      {
        path: 'bin-locations',
        component: BinLocationsComponent,
        data: {
          title: 'Home > Products > Bin-Locations'
        },
        resolve: {
          products: BinLocationsResolverService
        }
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ProductsRoutingModule {
}
