import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FulfillComponent } from './fulfill.component';
import {SharedModule} from "../../../../shared/shared.module";
import {CommentsComponent} from "../../shared-components/comments/comments.component";
import {AddProductModalModule} from '../../shared-components/add-product-modal/add-product-modal.module';
import {CategoryAnchorModule} from '../../shared-components/category-anchor/category-anchor.module';

@NgModule({
  declarations: [FulfillComponent],
    imports: [
        CommonModule,
        SharedModule,
        AddProductModalModule,
        CategoryAnchorModule
    ]
})
export class FulfillModule { }
