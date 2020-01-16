import {NgModule} from '@angular/core';
import {Routes, RouterModule} from '@angular/router';
import {UserResolverService} from './../../shared/services/user-resolver.service';
import {AccessService} from "../../shared/services/access.service";
import {EditSuppliersComponent} from "./edit-suppliers/edit-suppliers.component";
import {EditSuppliersResolverService} from "./edit-suppliers/service/edit-suppliers-resolver.service";
import {SuppliersComponent} from './suppliers.component';
import {SuppliersResolverService} from './services/suppliers-resolver.service';

const routes: Routes = [
  {
    path: '',
    resolve: {
      user: UserResolverService,
      access: AccessService
    },
    data: {
      title: 'Suppliers'
    },
    children: [
      {
        path: '',
        component: SuppliersComponent,
        resolve: {
          suppliers: SuppliersResolverService
        },
        data: {
          title: ''
        }
      },
      {
        path: 'edit/:id',
        component: EditSuppliersComponent,
        data: {
          title: 'Edit'
        }
        ,
        resolve: {
          supplier: EditSuppliersResolverService
        }
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
  providers: [EditSuppliersResolverService]
})
export class SuppliersRoutingModule { }
