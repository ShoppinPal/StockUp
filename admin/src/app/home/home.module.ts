import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { HomeRoutingModule } from './home-routing.module';
import { HomeComponent } from './home/home.component';

import { StoresModule } from '../stores/stores.module';
import {FullLayoutComponent} from "../containers/full-layout/full-layout.component";

@NgModule({
  imports: [
    CommonModule,
    HomeRoutingModule,
    StoresModule
  ],
  declarations: [HomeComponent],
  exports: [HomeComponent]
})
export class HomeModule { }
