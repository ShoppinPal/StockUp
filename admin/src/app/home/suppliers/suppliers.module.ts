import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {SharedModule} from '../../shared/shared.module';
import {LoadingModule} from 'ngx-loading';
import {FormsModule} from '@angular/forms';
import { SuppliersComponent } from './suppliers.component';
import {EditSuppliersModule} from "./edit-suppliers/edit-suppliers.module";
import {SuppliersRoutingModule} from "./suppliers-routing.module";

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    SharedModule,
    LoadingModule,
    EditSuppliersModule,
    SuppliersRoutingModule
  ],
  declarations: [SuppliersComponent]
})
export class SuppliersModule { }
