import { NgModule } from '@angular/core';
import {Routes, RouterModule} from '@angular/router';
import {AccessService} from '../../../shared/services/access.service';
import {StockOrdersComponent} from './stock-orders.component';
import {StockOrdersResolverService} from './services/stock-orders-resolver.service';
import {GeneratedComponent} from './generated/generated.component';
import {FulfillComponent} from './fulfill/fulfill.component';
import {ReceiveComponent} from './receive/receive.component';
import {ReceiveResolverService} from './receive/services/receive-resolver.service';
import {FulfillResolverService} from './fulfill/services/fulfill-resolver.service';
import {GeneratedResolverService} from './generated/services/generated-resolver.service';
import {CompleteComponent} from './complete/complete.component';
import {CompleteResolverService} from './complete/services/complete-resolver.service';
import {CreateStockOrderComponent} from './create-stock-order/create-stock-order.component';
import {CreateStockOrderResolverService} from './create-stock-order/services/create-stock-order-resolver.service';

const routes: Routes = [
    {
        path: '',
        resolve: {
            access: AccessService,
        },
        data: {
            title: 'Stock Orders'
        },
        children: [
            {
                path: '',
                component: StockOrdersComponent,
                resolve: {
                    stockOrders: StockOrdersResolverService
                },
                data: {
                    title: ''
                },
            },
            {
                path: 'create-stock-order',
                component: CreateStockOrderComponent,
                resolve: {
                    stockOrders: CreateStockOrderResolverService
                },
                data: {
                    title: 'Create'
                },
            },
            {
                path: 'generated/:id',
                component: GeneratedComponent,
                data: {
                    title: 'Generated'
                },
                resolve: {
                    stockOrderDetails: GeneratedResolverService
                }
            },
            {
                path: 'fulfill/:id',
                component: FulfillComponent,
                data: {
                    title: 'Fulfill'
                },
                resolve: {
                    stockOrderDetails: FulfillResolverService
                }
            },
            {
                path: 'receive/:id',
                component: ReceiveComponent,
                data: {
                    title: 'Receive'
                },
                resolve: {
                    stockOrderDetails: ReceiveResolverService
                }
            },
            {
                path: 'complete/:id',
                component: CompleteComponent,
                data: {
                    title: 'Complete'
                },
                resolve: {
                    stockOrderDetails: CompleteResolverService
                }
            }
        ]
    }
];


@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class StockOrdersRoutingModule { }
