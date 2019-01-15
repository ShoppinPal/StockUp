import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StockOrderDetailsComponent } from './stock-order-details.component';
import {LoadingModule} from 'ngx-loading';
import {NgxPaginationModule} from 'ngx-pagination';
import {StockOrderDetailsResolverService} from "./services/stock-order-details-resolver.service";
import {TabsModule} from 'ngx-bootstrap/tabs';


@NgModule({
  imports: [
    CommonModule,
    LoadingModule,
    NgxPaginationModule,
    TabsModule
  ],
  declarations: [StockOrderDetailsComponent],
  providers: [StockOrderDetailsResolverService]
})
export class StockOrderDetailsModule { }