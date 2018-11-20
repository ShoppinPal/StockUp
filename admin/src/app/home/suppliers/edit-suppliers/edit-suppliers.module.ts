import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EditSuppliersComponent } from './edit-suppliers.component';
import {FormsModule} from '@angular/forms';
import {LoadingModule} from 'ngx-loading';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    LoadingModule
  ],
  declarations: [EditSuppliersComponent]
})
export class EditSuppliersModule { }
