import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';

import {SignupRoutingModule} from './signup-routing.module';
import {SignupComponent} from './signup.component';

import {LoadingModule} from 'ngx-loading';

@NgModule({
  imports: [
    CommonModule,
    SignupRoutingModule,
    LoadingModule,
    FormsModule
  ],
  declarations: [SignupComponent]
})
export class SignupModule {
}
