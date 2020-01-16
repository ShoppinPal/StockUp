import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import {SharedModule} from '../../../../shared/shared.module';
import {AddProductModalComponent} from './add-product-modal.component';

@NgModule({
  declarations: [AddProductModalComponent],
  imports: [
    CommonModule,
    SharedModule
  ],
  exports:[AddProductModalComponent]
})
export class AddProductModalModule { }
