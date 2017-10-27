import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { StoresComponent } from '../stores/stores/stores.component';
import { PaymentsComponent } from '../payments/payments/payments.component';

const routes: Routes = [
  {
    path: '',
    children: [
      {
        path: '',
        redirectTo: 'stores',
        pathMatch: 'full'
      },
      {
        path: 'stores',
        component: StoresComponent,
        data: {
          title: 'Home > Stores'
        }
      },
      {
        path: 'payments',
        component: PaymentsComponent,
        data: {
          title: 'Home > Payments'
        }
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class HomeRoutingModule { }
