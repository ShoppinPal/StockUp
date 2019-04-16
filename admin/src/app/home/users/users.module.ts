import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {UsersComponent} from './users.component';
import {LoadingModule} from 'ngx-loading';
import {FormsModule} from '@angular/forms';
import {PaginationModule} from 'ngx-bootstrap';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    LoadingModule,
    PaginationModule
  ],
  declarations: [UsersComponent]
})
export class UsersModule {
}
