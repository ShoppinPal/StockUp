import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GeneratedComponent } from './generated.component';
import {SharedModule} from '../../../../shared/shared.module';
import {AddProductModalComponent} from '../shared/add-product-modal/add-product-modal.component';
import {StockOrdersModule} from '../stock-orders.module';
import {AddProductModalModule} from '../shared/add-product-modal/add-product-modal.module';
import {CommentsComponent} from "../comments/comments.component";

@NgModule({
  declarations: [GeneratedComponent],
  imports: [
    CommonModule,
    SharedModule,
    AddProductModalModule
  ]
})
export class GeneratedModule { }
