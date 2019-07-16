import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {UsersComponent} from './users.component';
import {LoadingModule} from 'ngx-loading';
import {FormsModule} from '@angular/forms';
import {PaginationModule} from 'ngx-bootstrap';
import {SharedModule} from '../../shared/shared.module';
import {UserDetailsModule} from './user-details/user-details.module';
import {UsersRoutingModule} from './users-routing';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    LoadingModule,
    SharedModule,
    PaginationModule,
    UserDetailsModule,
    UsersRoutingModule
  ],
  declarations: [UsersComponent]
})
export class UsersModule {
}
