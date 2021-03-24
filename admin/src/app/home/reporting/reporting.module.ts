import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ReportingRoutingModule } from './reporting-routing.module';
import {SharedModule} from '../../shared/shared.module';
import {HistoricalOrdersModule} from './historical-orders/historical-orders.module';
import {HistoricalOrdersResolverService} from './historical-orders/services/historical-orders-resolver.service';

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    HistoricalOrdersModule,
    ReportingRoutingModule,
    SharedModule,
  ],
  providers: [HistoricalOrdersResolverService]
})
export class ReportingModule { }
