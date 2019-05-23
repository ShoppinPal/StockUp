import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserDetailsComponent } from './user-details.component';
import { SharedModule } from '../../../shared/shared.module';

@NgModule({
  declarations: [UserDetailsComponent],
  imports: [
    CommonModule,
    SharedModule
  ]
})
export class UserDetailsModule { }
