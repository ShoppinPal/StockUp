import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductsComponent } from './products.component';
import { ProductsRoutingModule } from './products-routing.module';
import { BinLocationsModule } from './bin-locations/bin-locations.module';
import {BinLocationsResolverService} from "./bin-locations/services/bin-locations-resolver.service";
import {CategoriesModule} from "./categories/categories.module";
import {CategoriesResolverService} from "./categories/services/categories-resolver.service";

@NgModule({
  imports: [
    CommonModule,
    BinLocationsModule,
    CategoriesModule,
    ProductsRoutingModule
  ],
  declarations: [ProductsComponent],
  providers: [BinLocationsResolverService, CategoriesResolverService]
})
export class ProductsModule { }
