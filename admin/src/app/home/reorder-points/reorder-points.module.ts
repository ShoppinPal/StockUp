import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {ReorderPointsComponent} from './reorder-points.component';
import {SharedModule} from '../../shared/shared.module';
import {ReorderPointsRoutingModule} from './reorder-points-routing.module'

@NgModule({
  imports: [
    CommonModule,
    SharedModule,
    ReorderPointsRoutingModule
  ],
  declarations: [ReorderPointsComponent]
})
export class ReorderPointsModule {
}
