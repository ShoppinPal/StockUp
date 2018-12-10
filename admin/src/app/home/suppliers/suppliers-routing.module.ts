import {NgModule} from '@angular/core';
import {Routes, RouterModule} from '@angular/router';
import {UserResolverService} from './../../shared/services/user-resolver.service';
import {AccessService} from "../../shared/services/access.service";
import {EditSuppliersComponent} from "./edit-suppliers/edit-suppliers.component";
import {EditSuppliersResolverService} from "./edit-suppliers/service/edit-suppliers-resolver.service";

const routes: Routes = [
  {
    path: 'suppliers',
    resolve: {
      user: UserResolverService,
      access: AccessService
    },
    children: [
      {
        path: 'edit/:id',
        component: EditSuppliersComponent,
        data: {
          title: 'Home > Suppliers > Edit'
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
