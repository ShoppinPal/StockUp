import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StockOrderDetailsComponent } from './stock-order-details.component';
import {StockOrderDetailsResolverService} from "./services/stock-order-details-resolver.service";
import {SharedModule} from '../../../../shared/shared.module';


@NgModule({
  imports: [
    CommonModule,
    SharedModule
  ],
  declarations: [StockOrderDetailsComponent],
  providers: [StockOrderDetailsResolverService]
})
export class StockOrderDetailsModule { }
