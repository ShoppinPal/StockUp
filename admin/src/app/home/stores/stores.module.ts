import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoadingModule } from 'ngx-loading';
import {FormsModule} from '@angular/forms';
import { StoresComponent } from './stores.component';
import {StoresRoutingModule} from './stores-routing.modules';

@NgModule({
  imports: [
    CommonModule,
    LoadingModule,
    FormsModule,
    StoresRoutingModule
  ],
  declarations: [StoresComponent],
  exports: [StoresComponent]
})
export class StoresModule { }
