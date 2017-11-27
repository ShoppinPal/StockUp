import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BinLocationsFiltersComponent } from './bin-locations-filters.component';

@NgModule({
  imports: [
    CommonModule
  ],
  declarations: [BinLocationsFiltersComponent],
  exports: [BinLocationsFiltersComponent]
})
export class BinLocationsFiltersModule { }
