import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {ForgotPasswordRoutingModule} from './forgot-password-routing.module';
import {ForgotPasswordComponent} from './forgot-password.component';
import { LoadingModule } from 'ngx-loading';
import {FormsModule} from '@angular/forms';

@NgModule({
  imports: [
    CommonModule,
    ForgotPasswordRoutingModule,
    FormsModule,
    LoadingModule
  ],
  declarations: [ForgotPasswordComponent]
})
export class ForgotPasswordModule {
}
