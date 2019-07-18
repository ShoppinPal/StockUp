import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FileImportsComponent } from './file-imports.component';
import {SharedModule} from "../../shared/shared.module";
import {FileImportsRoutingModule} from "./file-imports-routing.module";
import {FileImportsDetailsModule} from "./file-imports-details/file-imports-details.module";

@NgModule({
  declarations: [FileImportsComponent],
  imports: [
    CommonModule,
    SharedModule,
    FileImportsRoutingModule,
    FileImportsDetailsModule
  ]
})
export class FileImportsModule { }
