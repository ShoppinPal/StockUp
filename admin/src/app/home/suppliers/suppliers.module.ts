import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {SharedModule} from '../../shared/shared.module';
import {LoadingModule} from 'ngx-loading';
import {NgxPaginationModule} from 'ngx-pagination';
import {FormsModule} from '@angular/forms';
import { SuppliersComponent } from './suppliers.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    SharedModule,
    LoadingModule,
    NgxPaginationModule
  ],
  declarations: [SuppliersComponent]
})
export class SuppliersModule { }
