import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CompleteComponent } from './complete.component';
import {SharedModule} from "../../../../shared/shared.module";

@NgModule({
  declarations: [CompleteComponent],
  imports: [
    CommonModule,
    SharedModule
  ]
})
export class CompleteModule { }
