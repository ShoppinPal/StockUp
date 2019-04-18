import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CategoriesComponent } from './categories.component';
import {SharedModule} from '../../../shared/shared.module';
import {LoadingModule} from 'ngx-loading';
// import {NgxPaginationModule} from 'ngx-pagination';
import {FormsModule} from '@angular/forms';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    SharedModule,
    LoadingModule,
    // NgxPaginationModule
  ],
  declarations: [CategoriesComponent]
})
export class CategoriesModule { }
