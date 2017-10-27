import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { HomeRoutingModule } from './home-routing.module';
import { HomeComponent } from './home/home.component';

import { StoresModule } from '../stores/stores.module';
import { PaymentsModule } from '../payments/payments.module';


@NgModule({
  imports: [
    CommonModule,
    HomeRoutingModule,
    StoresModule,
    PaymentsModule
  ],
  declarations: [HomeComponent],
  exports: [HomeComponent]
})
export class HomeModule { }
