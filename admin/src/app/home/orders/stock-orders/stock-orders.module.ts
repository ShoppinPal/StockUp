import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { StockOrdersComponent } from "./stock-orders.component";
import { SharedModule } from "../../../shared/shared.module";
import { FulfillModule } from "./fulfill/fulfill.module";
import { GeneratedModule } from "./generated/generated.module";
import { ReceiveModule } from "./receive/receive.module";
import { CompleteModule } from "./complete/complete.module";
import { SchedulePickerModule } from "../shared-components/schedule-picker/schedule-picker.module";
import { StockOrdersRoutingModule } from "./stock-orders-routing.module";
import { StockOrdersResolverService } from "./services/stock-orders-resolver.service";
import { BarcodeReceiveService } from "app/shared/services/barcodescan.service";
import { APIQueueDatabase } from "app/shared/services/indexdb.service";

@NgModule({
  imports: [
    CommonModule,
    StockOrdersRoutingModule,
    CompleteModule,
    SharedModule,
    FulfillModule,
    GeneratedModule,
    ReceiveModule,
    SchedulePickerModule,
  ],
  declarations: [StockOrdersComponent],
  providers: [
    StockOrdersResolverService,
    BarcodeReceiveService,
    APIQueueDatabase,
  ],
})
export class StockOrdersModule { }
