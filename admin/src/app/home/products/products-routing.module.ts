import {NgModule} from '@angular/core';
import {Routes, RouterModule} from '@angular/router';
import {BinLocationsComponent} from './bin-locations/bin-locations.component';
import {UserResolverService} from './../../shared/services/user-resolver.service';
import {AccessService} from "../../shared/services/access.service";
import {BinLocationsResolverService} from "./bin-locations/services/bin-locations-resolver.service";
import {CategoriesComponent} from "./categories/categories.component";
import {CategoriesResolverService} from "./categories/services/categories-resolver.service";

const routes: Routes = [
  {
    path: 'products',
    resolve: {
      user: UserResolverService,
      access: AccessService
    },
    children: [
      {
        path: 'products',
        redirectTo: 'bin-locations'
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
      },
      {
        path: 'categories',
        component: CategoriesComponent,
        data: {
          title: 'Home > Products > Categories'
        },
        resolve: {
          categories: CategoriesResolverService
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
