import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StuckOrdersComponent } from './stuck-orders.component';
import {StuckOrdersResolverService} from "./services/stuck-orders-resolver.service";

@NgModule({
  imports: [
    CommonModule
  ],
  declarations: [StuckOrdersComponent],
  providers: [StuckOrdersResolverService]
})
export class StuckOrdersModule { }
