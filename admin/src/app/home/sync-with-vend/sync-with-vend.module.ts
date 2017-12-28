import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {SyncWithVendComponent} from './sync-with-vend.component';
import {LoadingModule} from 'ngx-loading';
import {FormsModule} from '@angular/forms';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    LoadingModule
  ],
  declarations: [SyncWithVendComponent],
  exports: [SyncWithVendComponent]
})
export class SyncWithVendModule {
}
