import {NgModule} from '@angular/core';
import {Routes, RouterModule} from '@angular/router';
import {BinLocationsComponent} from './bin-locations/bin-locations.component';
import {UserResolverService} from '../../shared/services/user-resolver.service';
import {AccessService} from "../../shared/services/access.service";
import {BinLocationsResolverService} from "./bin-locations/services/bin-locations-resolver.service";
import {CategoriesComponent} from "./categories/categories.component";
import {CategoriesResolverService} from "./categories/services/categories-resolver.service";

const routes: Routes = [
  {
    path: '',
    resolve: {
      user: UserResolverService,
      access: AccessService
    },
    children: [
      {
        redirectTo: 'bin-locations',
        path: '',
        pathMatch: 'full'
      },
      {
        path: 'bin-locations',
        component: BinLocationsComponent,
        data: {
          title: 'Bin-Locations'
        },
        resolve: {
          products: BinLocationsResolverService
        }
      },
      {
        path: 'categories',
        component: CategoriesComponent,
        data: {
          title: 'Categories'
        },
        resolve: {
          categories: CategoriesResolverService
        }
      },
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ProductsRoutingModule {
}
