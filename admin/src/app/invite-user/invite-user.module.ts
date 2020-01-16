import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import {InviteUserRoutingModule} from './invite-user-routing.module';
import {InviteUserComponent} from './invite-user.component';
import { LoadingModule } from 'ngx-loading';
import {FormsModule} from '@angular/forms';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    InviteUserRoutingModule,
    LoadingModule
  ],
  declarations: [InviteUserComponent]
})
export class InviteUserModule { }
