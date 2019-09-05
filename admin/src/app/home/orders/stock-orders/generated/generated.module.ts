import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GeneratedComponent } from './generated.component';
import {SharedModule} from '../../../../shared/shared.module';
import {AddProductModalModule} from '../../shared-components/add-product-modal/add-product-modal.module';

@NgModule({
  declarations: [GeneratedComponent],
  imports: [
    CommonModule,
    SharedModule,
    AddProductModalModule
  ]
})
export class GeneratedModule { }
