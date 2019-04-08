import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StockOrderDetailsComponent } from './stock-order-details.component';
import {LoadingModule} from 'ngx-loading';
import {StockOrderDetailsResolverService} from "./services/stock-order-details-resolver.service";
import {TabsModule} from 'ngx-bootstrap/tabs';
import {FormsModule} from '@angular/forms';
import {PaginationModule} from 'ngx-bootstrap';


@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    LoadingModule,
    PaginationModule,
    TabsModule
  ],
  declarations: [StockOrderDetailsComponent],
  providers: [StockOrderDetailsResolverService]
})
export class StockOrderDetailsModule { }
