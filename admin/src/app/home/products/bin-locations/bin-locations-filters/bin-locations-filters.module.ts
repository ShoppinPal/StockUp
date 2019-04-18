import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {BinLocationsFiltersComponent} from './bin-locations-filters.component';
import {SharedModule} from '../../../../shared/shared.module';

@NgModule({
  imports: [
    CommonModule,
    SharedModule
  ],
  declarations: [BinLocationsFiltersComponent],
  exports: [BinLocationsFiltersComponent]
})
export class BinLocationsFiltersModule {
}
