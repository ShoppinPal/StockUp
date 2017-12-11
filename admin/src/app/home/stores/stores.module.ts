import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { StoresComponent } from './stores.component';

@NgModule({
  imports: [
    CommonModule
  ],
  declarations: [StoresComponent],
  exports: [StoresComponent]
})
export class StoresModule { }
