import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FulfillComponent } from './fulfill.component';
import {SharedModule} from "../../../../shared/shared.module";
import {CommentsComponent} from "../comments/comments.component";

@NgModule({
  declarations: [FulfillComponent],
  imports: [
    CommonModule,
    SharedModule
  ]
})
export class FulfillModule { }
