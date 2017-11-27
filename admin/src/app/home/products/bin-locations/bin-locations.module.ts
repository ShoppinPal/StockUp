import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BinLocationsComponent } from './bin-locations.component';
import { SharedModule } from '../../../shared/shared.module';
import { BinLocationsFiltersModule } from './bin-locations-filters/bin-locations-filters.module';
import { LoadingModule } from 'ngx-loading';
import {NgxPaginationModule} from 'ngx-pagination';
import { AutoFocusDirective } from './auto-focus.directive';

@NgModule({
  imports: [
    CommonModule,
    SharedModule,
    BinLocationsFiltersModule,
    LoadingModule,
    NgxPaginationModule
  ],
  declarations: [BinLocationsComponent, AutoFocusDirective]
})
export class BinLocationsModule { }
