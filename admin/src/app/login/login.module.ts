import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { LoginRoutingModule } from './login-routing.module';
import { LoginComponent } from './login.component';
import {FormsModule,ReactiveFormsModule} from '@angular/forms';

import { LoadingModule } from 'ngx-loading';

@NgModule({
  imports: [
    CommonModule,
    LoginRoutingModule,
    LoadingModule,
    FormsModule,
    ReactiveFormsModule,
  ],
  declarations: [LoginComponent]
})
export class LoginModule { }
