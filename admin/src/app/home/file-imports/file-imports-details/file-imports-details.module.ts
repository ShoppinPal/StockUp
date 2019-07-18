import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FileImportsDetailsComponent } from './file-imports-details.component';
import {SharedModule} from "../../../shared/shared.module";

@NgModule({
  declarations: [FileImportsDetailsComponent],
  imports: [
    CommonModule,
    SharedModule
  ]
})
export class FileImportsDetailsModule { }
