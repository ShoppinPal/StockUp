import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FulfillComponent } from './fulfill.component';
import {SharedModule} from "../../../../shared/shared.module";
import {CommentsComponent} from "../comments/comments.component";
import {AddProductModalModule} from '../shared/add-product-modal/add-product-modal.module';

@NgModule({
  declarations: [FulfillComponent],
  imports: [
    CommonModule,
    SharedModule,
    AddProductModalModule
  ]
})
export class FulfillModule { }
