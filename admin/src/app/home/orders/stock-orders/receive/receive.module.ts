import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReceiveComponent } from './receive.component';
import {SharedModule} from "../../../../shared/shared.module";
import {AddProductModalModule} from '../../shared-components/add-product-modal/add-product-modal.module';
import {CategoryAnchorModule} from '../../shared-components/category-anchor/category-anchor.module';

@NgModule({
  declarations: [ReceiveComponent],
    imports: [
        CommonModule,
        SharedModule,
        AddProductModalModule,
        CategoryAnchorModule
    ]
})
export class ReceiveModule { }
