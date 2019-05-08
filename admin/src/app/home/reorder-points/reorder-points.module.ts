import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {ReorderPointsComponent} from './reorder-points.component';
import {SharedModule} from '../../shared/shared.module';

@NgModule({
  imports: [
    CommonModule,
    SharedModule
  ],
  declarations: [ReorderPointsComponent]
})
export class ReorderPointsModule {
}
