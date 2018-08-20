import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';

import {SignupRoutingModule} from './signup-routing.module';
import {SignupComponent} from './signup.component';

import {LoadingModule} from 'ngx-loading';

@NgModule({
  imports: [
    CommonModule,
    SignupRoutingModule,
    LoadingModule
  ],
  declarations: [SignupComponent]
})
export class SignupModule {
}
