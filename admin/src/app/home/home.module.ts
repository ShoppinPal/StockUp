import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { HomeRoutingModule } from './home-routing.module';
import { HomeComponent } from './home/home.component';

import { StoresModule } from '../stores/stores.module';
import { PaymentsModule } from '../payments/payments.module';
import { SharedModule } from './../shared/shared.module';


@NgModule({
  imports: [
    CommonModule,
    HomeRoutingModule,
    SharedModule,
    StoresModule,
    PaymentsModule
  ],
  declarations: [HomeComponent],
  exports: [HomeComponent]
})
export class HomeModule { }
