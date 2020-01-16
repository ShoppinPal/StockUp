import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {ConnectComponent} from './connect.component';
import {LoadingModule} from 'ngx-loading';
import {FormsModule} from '@angular/forms';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    LoadingModule
  ],
  declarations: [ConnectComponent]
})
export class ConnectModule {
}
