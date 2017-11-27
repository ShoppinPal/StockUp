import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BinLocationsComponent } from './bin-locations.component';
import { SharedModule } from '../../../shared/shared.module';
import { BinLocationsFiltersModule } from './bin-locations-filters/bin-locations-filters.module';

@NgModule({
  imports: [
    CommonModule,
    SharedModule,
    BinLocationsFiltersModule
  ],
  declarations: [BinLocationsComponent]
})
export class BinLocationsModule { }
