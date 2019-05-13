import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReceiveComponent } from './receive.component';
import {SharedModule} from "../../../../shared/shared.module";

@NgModule({
  declarations: [ReceiveComponent],
  imports: [
    CommonModule,
    SharedModule
  ]
})
export class ReceiveModule { }
