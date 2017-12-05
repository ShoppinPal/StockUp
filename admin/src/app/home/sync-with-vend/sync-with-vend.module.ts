import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {SyncWithVendComponent} from './sync-with-vend.component';
import {LoadingModule} from 'ngx-loading';

@NgModule({
  imports: [
    CommonModule,
    LoadingModule
  ],
  declarations: [SyncWithVendComponent],
  exports: [SyncWithVendComponent]
})
export class SyncWithVendModule {
}
