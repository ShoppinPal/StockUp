import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {ConnectComponent} from './connect.component';
import {LoadingModule} from 'ngx-loading';

@NgModule({
  imports: [
    CommonModule,
    LoadingModule
  ],
  declarations: [ConnectComponent]
})
export class ConnectModule {
}
