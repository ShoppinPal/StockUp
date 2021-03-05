import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GeneratedComponent } from './generated.component';
import {SharedModule} from '../../../../shared/shared.module';
import {AddProductModalModule} from '../../shared-components/add-product-modal/add-product-modal.module';
import {SalesGraphModule} from '../../shared-components/sales-graph/sales-graph.module';

@NgModule({
  declarations: [GeneratedComponent],
  imports: [
    CommonModule,
    SharedModule,
    AddProductModalModule,
    SalesGraphModule
  ]
})
export class GeneratedModule { }
