import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoadingModule } from 'ngx-loading';
import {FormsModule} from '@angular/forms';

import { StoresComponent } from './stores.component';

@NgModule({
  imports: [
    CommonModule,
    LoadingModule,
    FormsModule
  ],
  declarations: [StoresComponent],
  exports: [StoresComponent]
})
export class StoresModule { }
